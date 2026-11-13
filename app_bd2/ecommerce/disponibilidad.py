

def tiendas_con_stock(repo, pid, lat=None, lon=None, k=5):
    filas = repo.ejecutar(f'SELECT tienda_id, stock FROM ecommerce_inventario WHERE producto_id = {int(pid)} AND stock > 0')
    inventario = {r['tienda_id']: r['stock'] for r in filas}
    if not inventario:
        return []
    ids = ','.join(str(i) for i in sorted(inventario))
    columnas = 'id, nombre, ubicacion'
    orden = f'ORDER BY id LIMIT {int(k)}'
    if lat is not None and lon is not None:
        distancia = f'distancia_haversine(ubicacion, POINT({float(lat)}, {float(lon)}))'
        columnas += f', {distancia} AS dist_m'
        orden = f'ORDER BY {distancia} LIMIT {int(k)}'
    filas = repo.ejecutar(f'SELECT {columnas} FROM ecommerce_tiendas WHERE id IN ({ids}) {orden}')
    return [{**r, 'stock': inventario[r['id']], 'simulada': True} for r in filas]
