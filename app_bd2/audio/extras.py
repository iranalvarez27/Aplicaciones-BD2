import json
import re
import threading
import unicodedata
from pathlib import Path

import httpx
from fastapi import APIRouter, Query

CACHE = Path(__file__).resolve().parents[2] / 'data' / 'cache_extras.json'
AGENTE = {'User-Agent': 'BD2-Aplicaciones/1.0'}
TIMEOUT = 8.0

_candado = threading.Lock()
_cache = None


def _leer_cache():
    global _cache
    if _cache is None:
        try:
            _cache = json.loads(CACHE.read_text(encoding='utf-8'))
        except (OSError, ValueError):
            _cache = {}
        _cache.setdefault('portadas', {})
        _cache.setdefault('letras', {})
    return _cache


def _guardar_cache():
    try:
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(json.dumps(_cache, ensure_ascii=False), encoding='utf-8')
    except OSError:
        pass


def _normal(texto):
    texto = unicodedata.normalize('NFKD', texto or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9 ]+', ' ', texto).split()


def _limpio(titulo):
    original = titulo
    titulo = re.sub(r'\s*[\(\[].*?[\)\]]', '', titulo)
    titulo = re.sub(r'\s+(ft|feat)\.?\s.*$', '', titulo, flags=re.I)
    titulo = re.sub(r'\s+-\s*.*$', '', titulo).replace('"', '')
    titulo = re.sub(r'^\s*[A-Za-zÁÉÍÓÚÑáéíóúñ ]+:\s*', '', titulo)
    return titulo.strip() or original


def _coincide(artista, candidato):
    buscado = set(_normal(artista))
    return not buscado or bool(buscado & set(_normal(candidato)))


def _json(cliente, url, **params):
    r = cliente.get(url, params=params)
    if r.status_code != 200:
        return None
    return r.json()


def _portada_itunes(cliente, titulo, artista):
    for consulta in dict.fromkeys((f'{artista} {titulo}', f'{artista} {_limpio(titulo)}')):
        datos = _json(cliente, 'https://itunes.apple.com/search', term=consulta, entity='song', limit=8) or {}
        for item in datos.get('results', []):
            if _coincide(artista, item.get('artistName', '')) and item.get('artworkUrl100'):
                return re.sub(r'/\d+x\d+bb', '/600x600bb', item['artworkUrl100'])
    return None


def _portada_deezer(cliente, titulo, artista):
    datos = _json(cliente, 'https://api.deezer.com/search', q=f'{artista} {_limpio(titulo)}', limit=8) or {}
    for item in datos.get('data', []):
        album = item.get('album') or {}
        if _coincide(artista, (item.get('artist') or {}).get('name', '')) and album.get('cover_big'):
            return album['cover_big']
    return None


def buscar_portada(titulo, artista):
    clave = f'{artista}|{titulo}'.lower()
    with _candado:
        guardada = _leer_cache()['portadas'].get(clave)
    if guardada:
        return guardada
    url = None
    try:
        with httpx.Client(timeout=TIMEOUT, headers=AGENTE) as cliente:
            url = _portada_itunes(cliente, titulo, artista) or _portada_deezer(cliente, titulo, artista)
    except (httpx.HTTPError, ValueError):
        return None
    if url:
        with _candado:
            _leer_cache()['portadas'][clave] = url
            _guardar_cache()
    return url


_LINEA = re.compile(r'^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$')


def _sincronizada(texto):
    lineas = []
    for fila in (texto or '').splitlines():
        m = _LINEA.match(fila.strip())
        if m and m.group(3).strip():
            lineas.append({'t': round(int(m.group(1)) * 60 + float(m.group(2)), 2), 'texto': m.group(3).strip()})
    return lineas


def _letra_lrclib(cliente, titulo, artista, duracion):
    candidatos = []
    params = {'artist_name': artista, 'track_name': titulo}
    if duracion:
        params['duration'] = int(duracion)
    exacta = _json(cliente, 'https://lrclib.net/api/get', **params)
    if exacta:
        candidatos.append(exacta)
    for consulta in dict.fromkeys((f'{artista} {titulo}', f'{artista} {_limpio(titulo)}', _limpio(titulo))):
        candidatos += _json(cliente, 'https://lrclib.net/api/search', q=consulta) or []
    candidatos = [c for c in candidatos if not c.get('instrumental')]
    del_artista = [c for c in candidatos if _coincide(artista, c.get('artistName', ''))]
    if not del_artista and duracion:
        palabras = set(_normal(_limpio(titulo)))
        del_artista = [c for c in candidatos if palabras and palabras <= set(_normal(c.get('trackName', '')))
                       and abs((c.get('duration') or 0) - duracion) <= 4]
    candidatos = del_artista
    candidatos.sort(key=lambda c: (not c.get('syncedLyrics'), abs((c.get('duration') or 0) - (duracion or 0))))
    for c in candidatos:
        sinc = _sincronizada(c.get('syncedLyrics'))
        plana = (c.get('plainLyrics') or '').strip()
        if sinc or plana:
            return {'sincronizada': sinc, 'plana': plana, 'fuente': 'lrclib.net'}
    return None


def buscar_letra(titulo, artista, duracion):
    clave = f'{artista}|{titulo}'.lower()
    with _candado:
        guardada = _leer_cache()['letras'].get(clave)
    if guardada:
        return guardada
    try:
        with httpx.Client(timeout=TIMEOUT, headers=AGENTE) as cliente:
            letra = _letra_lrclib(cliente, titulo, artista, duracion)
    except (httpx.HTTPError, ValueError):
        return None
    if letra:
        with _candado:
            _leer_cache()['letras'][clave] = letra
            _guardar_cache()
    return letra


def agregar_extras(router: APIRouter):
    @router.get('/acapella/cover')
    def portada(titulo: str = Query(max_length=200), artista: str = Query(default='', max_length=200)):
        return {'url': buscar_portada(titulo, artista)}

    @router.get('/acapella/lyrics')
    def letra(titulo: str = Query(max_length=200), artista: str = Query(default='', max_length=200),
              duracion: float | None = Query(default=None, ge=0, le=3600)):
        return buscar_letra(titulo, artista, duracion) or {'sincronizada': [], 'plana': '', 'fuente': None}
