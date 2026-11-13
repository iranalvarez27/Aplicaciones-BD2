import base64
import os
import threading
import uuid
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel
from typing import Optional

from app_bd2.engine_client import ConexionHTTP, ENGINE_URL
from app_bd2.ecommerce.router import crear_router as router_ecommerce
try:
    from app_bd2.audio.router import crear_router as router_audio
except ImportError as error:
    router_audio, ERROR_AUDIO = None, str(error)

APP_ROOT = Path(__file__).resolve().parents[1]
UPLOADS = APP_ROOT / 'data' / 'uploads'
EXTENSIONES_MEDIA = {'.jpg', '.jpeg', '.png', '.bmp', '.webp', '.mp3', '.wav', '.ogg', '.flac', '.m4a'}
TAMANO_MAX_MEDIA = 50 * 1024 * 1024

app = FastAPI(title='Aplicaciones BD2', description='E-commerce híbrido y detección de copyright en audio, sobre el API REST del Minigestor', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

conexion = ConexionHTTP()
audio = router_audio(conexion, str(APP_ROOT)) if router_audio else None
if audio:
    app.include_router(audio)
else:
    @app.get('/api/audio/collections')
    @app.post('/api/audio/detect')
    def audio_no_disponible():
        raise HTTPException(503, 'Detección de audio no disponible: ' + ERROR_AUDIO)
app.include_router(router_ecommerce(conexion))


@app.on_event('startup')
def precalentar_audio():
    if audio:
        threading.Thread(target=audio.precalentar, daemon=True).start()


class MediaUploadRequest(BaseModel):
    filename: str
    content_base64: str
    content_type: Optional[str] = None


@app.get('/api/health')
def health():
    motor = conexion.salud()
    return {'status': 'ok' if motor else 'degraded', 'engine_url': ENGINE_URL, 'engine': 'ok' if motor else 'no disponible'}


@app.post('/api/media/upload')
def upload_media(req: MediaUploadRequest):
    try:
        UPLOADS.mkdir(parents=True, exist_ok=True)
        nombre = uuid.uuid4().hex + '_' + os.path.basename(req.filename.replace(chr(92), '/'))
        extension = os.path.splitext(nombre)[1].lower()
        if extension not in EXTENSIONES_MEDIA:
            raise ValueError(f"tipo de archivo no permitido '{extension}' (permitidos: {', '.join(sorted(EXTENSIONES_MEDIA))})")
        b64 = req.content_base64.split(',', 1)[1] if ',' in req.content_base64 else req.content_base64
        if len(b64) > 4 * ((TAMANO_MAX_MEDIA + 2) // 3):
            raise ValueError('el archivo supera el limite permitido')
        datos = base64.b64decode(b64, validate=True)
        if not datos:
            raise ValueError('el archivo esta vacio')
        if len(datos) > TAMANO_MAX_MEDIA:
            raise ValueError(f'el archivo pesa mas de {TAMANO_MAX_MEDIA // (1024 * 1024)} MB')
        (UPLOADS / nombre).write_bytes(datos)
        return {'status': 'success', 'filename': nombre, 'path': f'uploads/{nombre}',
                'url': f'/api/media/uploads/{nombre}', 'size': len(datos)}
    except Exception as ex:
        raise HTTPException(status_code=400, detail=f'Error al guardar archivo: {ex}')


@app.get('/api/media/{subpath:path}')
async def get_media(subpath: str, request: Request):
    if subpath.startswith('uploads/'):
        ruta = (APP_ROOT / 'data' / subpath).resolve()
        if ruta.is_file() and ruta.is_relative_to(UPLOADS.resolve()):
            return FileResponse(ruta)
        raise HTTPException(404, 'Archivo multimedia no encontrado')
    cabeceras = {k: v for k in ('range', 'if-range') if (v := request.headers.get(k))}
    cliente = httpx.AsyncClient(base_url=ENGINE_URL, timeout=60)
    try:
        peticion = cliente.build_request('GET', '/api/media/' + subpath, headers=cabeceras)
        respuesta = await cliente.send(peticion, stream=True)
    except httpx.HTTPError as ex:
        await cliente.aclose()
        raise HTTPException(502, f'No se pudo contactar con el motor: {ex}')
    if respuesta.status_code >= 400:
        await respuesta.aclose(); await cliente.aclose()
        raise HTTPException(respuesta.status_code, 'Archivo multimedia no encontrado')

    async def cuerpo():
        try:
            async for trozo in respuesta.aiter_raw():
                yield trozo
        finally:
            await respuesta.aclose(); await cliente.aclose()

    permitidas = ('content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag')
    return StreamingResponse(cuerpo(), status_code=respuesta.status_code,
                             headers={k: v for k, v in respuesta.headers.items() if k.lower() in permitidas})


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app_bd2.main:app', host='0.0.0.0', port=int(os.environ.get('PORT', 8100)))
