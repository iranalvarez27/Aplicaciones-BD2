import { uploadMediaApi } from "../../utils/api";

async function json(res, porDefecto) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : porDefecto);
  return data;
}

export const listarBibliotecas = (signal) =>
  fetch("/api/audio/collections", { signal }).then((r) => json(r, "No se pudo cargar la biblioteca de audio."));

export const listarRepertorio = (signal) =>
  fetch("/api/audio/acapella/songs", { signal }).then((r) => json(r, "No se pudo cargar el repertorio."));

export const estadoRepertorio = (signal) =>
  fetch("/api/audio/acapella/status", { signal }).then((r) => json(r, "No se pudo leer el estado del repertorio."));

const enviar = (url, cuerpo, error) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }).then(
    (r) => json(r, error),
  );

export const detectarCopyright = (path, n, params, progresoId) =>
  enviar("/api/audio/detect", { path, n_coleccion: Number(n), ...params, progreso_id: progresoId }, "No se pudo completar el análisis.");

export const leerProgreso = (id, signal) =>
  fetch(`/api/audio/detect/progress?id=${encodeURIComponent(id)}`, { signal }).then((r) => json(r, "No se pudo leer el avance."));

export const reconocerAcapella = (path) =>
  enviar("/api/audio/acapella/detect", { path }, "No se pudo reconocer la canción.");

export const prepararRepertorio = () =>
  enviar("/api/audio/acapella/prepare", {}, "No se pudo iniciar la preparación del repertorio.");

export const subirAudio = uploadMediaApi;

export const estadoLetras = (signal) =>
  fetch("/api/audio/letras/status", { signal }).then((r) => json(r, "No se pudo leer el estado de las letras."));

export const prepararLetras = () => enviar("/api/audio/letras/prepare", {}, "No se pudo iniciar la preparación de las letras.");
