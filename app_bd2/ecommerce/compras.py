from collections import defaultdict
import hashlib
import json
import time

from app_bd2.ecommerce.afinidades import refrescar
from app_bd2.ecommerce.repositorio import Repositorio, literal

TABLAS_COMPRA = ['ecommerce_afinidades', 'ecommerce_estado', 'ecommerce_interacciones', 'ecommerce_inventario', 'ecommerce_operaciones']


def siguiente_id(repo, tabla):
    filas = repo.ejecutar(f'SELECT id FROM {tabla} ORDER BY id DESC LIMIT 1')
    return filas[0]['id'] + 1 if filas else 1


def registrar_interaccion(conexion, usuario_id, producto_id, tipo):
    if tipo not in ('vista', 'carrito'):
        raise ValueError('El evento debe ser vista o carrito')
    repo = Repositorio(conexion)
    with repo.transaccion(['ecommerce_interacciones']):
        if not repo.ejecutar(f'SELECT id FROM ecommerce_productos WHERE id = {producto_id}'):
            raise LookupError('Producto inexistente')
        nuevo = siguiente_id(repo, 'ecommerce_interacciones')
        repo.insertar('ecommerce_interacciones', [nuevo, usuario_id, producto_id, tipo, int(time.time() * 1000), 'demo_usuario'])
    return {'id': nuevo, 'tipo': tipo}


def comprar(conexion, usuario_id, solicitud, items):
    if not items or len(items) > 20:
        raise ValueError('La compra debe contener entre 1 y 20 líneas')
    if len({(i['producto_id'], i['tienda_id']) for i in items}) != len(items):
        raise ValueError('Agrupe las cantidades de las líneas repetidas')
    firma = hashlib.sha256(json.dumps(sorted(items, key=lambda i: (i['producto_id'], i['tienda_id'])), sort_keys=True).encode()).hexdigest()
    repo = Repositorio(conexion)
    with repo.transaccion(TABLAS_COMPRA):
        previas = repo.ejecutar(f'SELECT * FROM ecommerce_operaciones WHERE solicitud = {literal(solicitud)}')
        if previas:
            previa = previas[0]
            if previa['usuario_id'] != usuario_id or previa['firma'] != firma:
                raise ValueError('La clave de solicitud ya pertenece a otra compra')
            return json.loads(previa['respuesta'])
        nuevo_evento = siguiente_id(repo, 'ecommerce_interacciones')
        total = 0
        for item in items:
            pid, tienda, cantidad = item['producto_id'], item['tienda_id'], item['cantidad']
            if cantidad < 1:
                raise ValueError('Cantidad inválida')
            inventario = repo.ejecutar(f'SELECT * FROM ecommerce_inventario WHERE producto_id = {pid} AND tienda_id = {tienda}')
            if len(inventario) != 1 or inventario[0]['stock'] < cantidad:
                raise ValueError(f'Stock insuficiente para el producto {pid} en la tienda {tienda}')
            producto = repo.ejecutar(f'SELECT precio_centavos FROM ecommerce_productos WHERE id = {pid}')
            if not producto:
                raise LookupError('Producto inexistente')
            fila = inventario[0]
            repo.ejecutar(f'UPDATE ecommerce_inventario SET stock = {fila["stock"] - cantidad} WHERE id = {fila["id"]}')
            repo.insertar('ecommerce_interacciones', [nuevo_evento, usuario_id, pid, 'compra', int(time.time() * 1000), 'demo_usuario'])
            nuevo_evento += 1
            total += cantidad * producto[0]['precio_centavos']
        version = refrescar(repo)
        resultado = {'solicitud': solicitud, 'items': items, 'total_centavos': total, 'moneda': 'USD',
                     'version_afinidades': version, 'simulada': True}
        repo.insertar('ecommerce_operaciones', [siguiente_id(repo, 'ecommerce_operaciones'), solicitud, usuario_id, firma,
                                               json.dumps(resultado, separators=(',', ':'))])
    return resultado
