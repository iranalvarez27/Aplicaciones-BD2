import os
import re
import time
from dataclasses import dataclass, field

import httpx

ENGINE_URL = os.environ.get('ENGINE_URL', 'http://127.0.0.1:8000').rstrip('/')
TIMEOUT = float(os.environ.get('ENGINE_TIMEOUT', '600'))
_ENCABEZADOS_NO_FILAS = (['Operación', 'Filas Afectadas'], ['Mensaje'], ['Estado'])


@dataclass
class Resultado:
    ok: bool
    error: str | None = None
    plan: list = field(default_factory=list)
    filas: list | None = None
    transaccion_activa: bool = False


def aplanar_plan(arbol):
    pasos = []

    def visitar(nodo):
        etiqueta = nodo.get('method') or nodo.get('node_type')
        if etiqueta and nodo.get('node_type') != 'QueryPlan':
            pasos.append(str(etiqueta))
        for hijo in nodo.get('children') or []:
            visitar(hijo)

    if isinstance(arbol, dict):
        visitar(arbol)
    return pasos


class _Catalogo:
    def __init__(self, conexion):
        self.conexion = conexion
        self._existentes = set()

    def existe_tabla(self, nombre):
        if nombre in self._existentes:
            return True
        if not re.fullmatch(r'[A-Za-z_][A-Za-z_0-9]*', nombre):
            return False
        ok = self.conexion.execute(f'SELECT id FROM {nombre} WHERE id = 1').ok
        if ok:
            self._existentes.add(nombre)
        return ok


class _Locks:
    def __init__(self, conexion):
        self.conexion = conexion

    def acquire(self, session_id, tabla, modo):
        res = self.conexion.execute(f'DELETE FROM {tabla} WHERE id = -1', session_id)
        if not res.ok:
            raise ValueError(res.error)


class _Transacciones:
    def __init__(self, conexion):
        self.conexion = conexion

    def is_active(self, session_id):
        return self.conexion.sesiones.get(session_id, False)


class ConexionHTTP:
    def __init__(self, url=ENGINE_URL):
        self.url = url
        self.http = httpx.Client(base_url=url, timeout=TIMEOUT)
        self.sesiones = {}
        self.catalog = _Catalogo(self)
        self.lock_manager = _Locks(self)
        self.txn_manager = _Transacciones(self)
        self._tablas = None

    def consulta_cruda(self, sql, session_id=None):
        try:
            r = self.http.post('/api/query', json={'query': sql, 'session_id': session_id})
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as ex:
            raise ConnectionError(f'No se pudo contactar con el motor en {self.url}: {ex}') from ex

    def execute_query(self, sql, session_id=None):
        return self.consulta_cruda(sql, session_id)

    def execute(self, sql, session_id=None):
        datos = self.consulta_cruda(sql, session_id)
        activa = bool((datos.get('transaction') or {}).get('active'))
        if session_id is not None:
            self.sesiones[session_id] = activa
        if datos.get('status') != 'success':
            return Resultado(False, datos.get('error') or 'Error del motor', aplanar_plan(datos.get('plan')),
                             None, activa)
        columnas, filas = datos.get('columns') or [], datos.get('rows') or []
        plan = aplanar_plan(datos.get('plan'))
        if columnas in _ENCABEZADOS_NO_FILAS:
            return Resultado(True, None, plan, None, activa)
        return Resultado(True, None, plan, [dict(zip(columnas, f)) for f in filas] if columnas != ['Resultado'] else [],
                         activa)

    def tablas(self, ttl=30):
        ahora = time.monotonic()
        if self._tablas is None or ahora - self._tablas[0] > ttl:
            r = self.http.get('/api/tables')
            r.raise_for_status()
            self._tablas = (ahora, r.json())
        return self._tablas[1]

    def salud(self):
        try:
            r = self.http.get('/api/health', timeout=5)
            return r.status_code == 200
        except httpx.HTTPError:
            return False
