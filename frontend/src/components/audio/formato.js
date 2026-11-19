export const tiempo = (s) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s)) % 60).padStart(2, "0")}`;

export const tono = (t) => (t === 0 ? "Mismo tono" : `${t > 0 ? "+" : ""}${t} semitonos`);

export const LIMITES = { copyright: [5, 600], acapella: [8, 120], grabacion: [5, 120] };

export const EXTENSIONES = /\.(mp3|wav|ogg|flac|m4a)$/i;
export const TAMANO_MAX = 50 * 1024 * 1024;

export const claveFragmento = (c) => `${c.track_id}:${c.inicio_s}:${c.fin_s}`;

export const COLORES = ["#1ed760", "#a78bfa", "#ff6b9a", "#ffb547", "#4cb3ff"];

export function coloresPorPista(coincidencias) {
  const mapa = new Map();
  for (const c of coincidencias) if (!mapa.has(c.track_id)) mapa.set(c.track_id, COLORES[mapa.size % COLORES.length]);
  return mapa;
}

export function etiquetaTipo(c) {
  if (c.tipo !== "cancion_cantada") return "Misma grabación";
  return /melod/i.test(c.metodo_verificacion || "") ? "Canción cantada (melodía)" : "Canción cantada (letra)";
}
