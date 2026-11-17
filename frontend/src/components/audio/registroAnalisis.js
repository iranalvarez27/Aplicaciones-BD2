const CLAVE = "bd2.copyright.historial";
const MAXIMO = 12;

export function leerHistorial() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

function escribir(lista) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
  }
  return lista;
}

export function guardarAnalisis(archivo, resultado) {
  const { segmentos, parametros, ...resto } = resultado;
  void segmentos;
  void parametros;
  const titulos = [...new Set(resultado.coincidencias.map((c) => c.titulo))];
  const nuevo = {
    id: `${Date.now()}`,
    fecha: new Date().toISOString(),
    archivo,
    hay: resultado.coincidencias.length > 0,
    titulos,
    resultado: { ...resto, segmentos: [] },
  };
  return escribir([nuevo, ...leerHistorial()].slice(0, MAXIMO));
}

export const borrarAnalisis = (id) => escribir(leerHistorial().filter((x) => x.id !== id));
export const vaciarHistorial = () => escribir([]);
