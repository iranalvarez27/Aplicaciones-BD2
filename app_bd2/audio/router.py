from dataclasses import replace
from functools import lru_cache
import json
import os
import sys
import threading
import time
from pathlib import Path
from urllib.parse import quote

ENGINE_HOME = Path(os.environ.get('ENGINE_HOME', Path(__file__).resolve().parents[3] / 'Proyecto-BD2')).resolve()
if str(ENGINE_HOME) not in sys.path:
    sys.path.append(str(ENGINE_HOME))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from deteccion.detector import BusquedaAudio, Detector, Parametros
from multimedia import bovw, config
from multimedia import colecciones_audio
from multimedia.colecciones_audio import normalizar_ruta, ruta_local
from multimedia.mfcc import cargar_audio


class DetectionRequest(BaseModel):
    path: str
    n_coleccion: int = Field(default=10000, gt=0)
    segmento_s: float = Field(default=5, ge=5, le=10)
    paso_s: float = Field(default=.5, ge=.1, le=1)
    k: int = Field(default=100, ge=1, le=200)
    umbral: float = Field(default=.65, ge=0, le=1)
    min_votos: int = Field(default=2, ge=2, le=20)
    metodo: str = 'EXACTO'
    representacion: str = 'hibrida'
    umbral_secuencia: float = Field(default=.60, ge=0, le=1)
    reducir_ruido: bool = True


def resolver_subida(root, ruta):
    uploads = (Path(root) / 'data' / 'uploads').resolve()
    candidato = (Path(root) / 'data' / ruta).resolve()
    if not candidato.is_relative_to(uploads) or not candidato.is_file():
        raise ValueError('seleccione un audio subido a data/uploads')
    if candidato.suffix.lower() not in config.EXTENSIONES_AUDIO:
        raise ValueError('el archivo debe ser un audio compatible')
    return candidato


def tabla_audio(n):
    return colecciones_audio.tabla(n)


def url_original(ruta, root):
    ruta = normalizar_ruta(ruta)
    if Path(ruta).is_absolute():
        try:
            ruta = Path(ruta).resolve().relative_to(Path(root).resolve()).as_posix()
        except ValueError:
            return None

    if not ruta.startswith(('bench/data/', 'data/')) or '..' in Path(ruta).parts:
        return None
    base = os.environ.get('MEDIA_BASE_URL', '').rstrip('/')
    return (base or '/api/media') + '/' + quote(ruta, safe='/')


def enriquecer(resultado, metadatos, root):
    for item in resultado['coincidencias'] + [c for s in resultado['segmentos']
                                              for c in s['coincidencias'] + s['candidatos']]:
        meta = metadatos.get(item['track_id'], {})
        item.update(titulo=meta.get('titulo') or 'Pista ' + item['track_id'],
                    artista=meta.get('artista') or 'Artista desconocido',
                    genero=meta.get('genero', ''),
                    audio_url=url_original(meta.get('ruta', ''), ENGINE_HOME))
        if meta.get('fuente'):
            item.update(fuente=meta['fuente'], id_origen=meta.get('id_origen', item['track_id']))
    return resultado


def leer_metadatos(conexion, tabla, con_procedencia):
    columnas_origen = ', fuente, id_origen' if con_procedencia else ''
    res = conexion.execute_query('SELECT track_id, segmento, titulo, artista, genero, ruta' + columnas_origen + ' FROM ' + tabla + ';')
    if res['status'] != 'success':
        raise ValueError(res.get('error') or 'No se pudieron leer los metadatos')
    metas, segmentos = {}, set()
    for fila in res['rows']:
        meta = dict(zip(res['columns'], fila))
        metas[str(meta['track_id'])] = meta
        segmentos.add((str(meta['track_id']), int(meta['segmento'])))
    return metas, segmentos


def crear_router(conexion, root):
    router = APIRouter(prefix='/api/audio', tags=['Deteccion de audio'])
    busqueda_lock = threading.Lock()
    metadatos_lock = threading.Lock()
    meta_en_memoria = {}
    TTL_META = 300

    def obtener_metadatos(tabla, con_procedencia, refrescar=False):
        clave = (tabla, con_procedencia)
        with metadatos_lock:
            guardado = meta_en_memoria.get(clave)
            if guardado and not refrescar and time.monotonic() - guardado[0] < TTL_META:
                return guardado[1], guardado[2], True, 'memoria'
            metas, segmentos = leer_metadatos(conexion, tabla, con_procedencia)
            meta_en_memoria[clave] = (time.monotonic(), metas, segmentos)
            return metas, segmentos, False, 'sql'

    def preparar(n, metodo, representacion):
        vectores, ids = bovw.cargar_coleccion('audio', n)
        return BusquedaAudio(vectores, ids, metodo, representacion)

    @lru_cache(maxsize=3)
    def busqueda_guardada(n, metodo, representacion, firma):
        return preparar(n, metodo, representacion)

    def obtener_busqueda(n, params):
        carpeta = config.directorio_coleccion('audio', n)
        try:
            archivos = (carpeta / nombre for nombre in ('coleccion.json', 'vectores.npy', 'ids.npy'))
            firma = tuple((info.st_mtime_ns, info.st_ctime_ns, info.st_size, info.st_ino) for info in map(Path.stat, archivos))
        except FileNotFoundError:
            return preparar(n, params.metodo, params.representacion)
        with busqueda_lock:
            return busqueda_guardada(n, params.metodo, params.representacion, firma)

    def precalentar():
        try:
            import scipy.signal
            import librosa
            from deteccion import chroma
            n = bovw.n_coleccion_vigente('audio')
            bovw._extractor('audio', n)
            for metodo in ('EXACTO', 'HNSW', 'IVF'):
                inicio = time.perf_counter()
                obtener_busqueda(n, replace(Parametros(), metodo=metodo))
                print(f'[audio] índice {metodo} listo para n={n} en {time.perf_counter() - inicio:.1f} s', flush=True)
        except Exception as error:
            print(f'[audio] precalentamiento interrumpido: {error!r}', flush=True)

    router.precalentar = precalentar

    @router.get('/collections')
    def colecciones(incluir_auxiliares: bool = False):
        carpeta = config.directorio_colecciones('audio')
        salida = []
        for ruta in carpeta.glob('*/coleccion.json'):
            if not ruta.parent.name.isdigit():
                continue
            n = int(ruta.parent.name)
            info = json.loads(ruta.read_text(encoding='utf-8'))
            tabla = colecciones_audio.tabla(n, info)
            if conexion.catalog.existe_tabla(tabla):
                salida.append(colecciones_audio.describir(n, info))
        if not incluir_auxiliares:
            fuentes = [c for c in salida if c['completa'] and not c['unificada']]
            salida = fuentes or [c for c in salida if c['completa']] or salida
        return {'colecciones': sorted(salida, key=lambda c: c['n'])}

    @router.post('/detect')
    def detectar(req: DetectionRequest):
        inicio_total = time.perf_counter()
        try:
            ruta = resolver_subida(root, req.path)
            params = replace(Parametros(), **req.model_dump(exclude={'path', 'n_coleccion'}))
            params.validar()
            tabla = tabla_audio(req.n_coleccion)
            if not conexion.catalog.existe_tabla(tabla):
                raise ValueError('Falta la tabla ' + tabla + ' en el motor; importe la coleccion de audio primero')
            extractor = bovw._extractor('audio', req.n_coleccion)
            busqueda = obtener_busqueda(req.n_coleccion, params)
            info = colecciones_audio.informacion(req.n_coleccion)
            inicio_meta = time.perf_counter()
            metas, segmentos_tabla, cache_meta, origen_meta = obtener_metadatos(tabla, bool(info.get('con_procedencia')))
            tiempo_meta = (time.perf_counter() - inicio_meta) * 1000
            faltantes = set(busqueda.ids) - segmentos_tabla
            if faltantes and cache_meta:
                metas, segmentos_tabla, cache_meta, origen_meta = obtener_metadatos(
                    tabla, bool(info.get('con_procedencia')), refrescar=True)
                faltantes = set(busqueda.ids) - segmentos_tabla
                tiempo_meta = (time.perf_counter() - inicio_meta) * 1000
            if faltantes:
                raise ValueError(f'Faltan {len(faltantes)} segmentos de la biblioteca en la tabla {tabla}. '
                                 'Actualice la biblioteca y compruebe que usa la colección correspondiente.')
            y = cargar_audio(ruta, int(extractor.meta['sr']))
            def original(pid):
                return ruta_local(metas[pid]['ruta'], ENGINE_HOME)
            detector = Detector(None, None, extractor, params, resolver_original=original, busqueda=busqueda)
            resultado = enriquecer(detector.detectar(y), metas, ENGINE_HOME)
            resultado['metricas'].update(metadata_ms=round(tiempo_meta, 2), metadata_cache=cache_meta,
                                          metadata_origen=origen_meta,
                                          total_ms=round((time.perf_counter() - inicio_total) * 1000, 2))
            resultado.update(n_coleccion=req.n_coleccion, tabla=tabla, audio_url='/api/media/' + quote(req.path, safe='/'))
            return resultado
        except FileNotFoundError as ex:
            raise HTTPException(status_code=409, detail='Modelo no disponible: ' + str(ex)) from ex
        except (ValueError, OSError, RuntimeError) as ex:
            raise HTTPException(status_code=400, detail=str(ex)) from ex

    return router
