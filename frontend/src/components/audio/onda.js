const MAX_BYTES = 40 * 1024 * 1024;

export async function picosDeAudio(archivo, cantidad = 220) {
  const Contexto = window.AudioContext || window.webkitAudioContext;
  if (!Contexto || !archivo || archivo.size > MAX_BYTES) return null;
  const ctx = new Contexto();
  try {
    const audio = await ctx.decodeAudioData(await archivo.arrayBuffer());
    const datos = audio.getChannelData(0);
    const paso = Math.max(1, Math.floor(datos.length / cantidad));
    const picos = new Array(cantidad).fill(0);
    for (let i = 0; i < cantidad; i++) {
      let max = 0;
      const fin = Math.min(datos.length, (i + 1) * paso);
      for (let j = i * paso; j < fin; j += Math.max(1, Math.floor(paso / 64))) max = Math.max(max, Math.abs(datos[j]));
      picos[i] = max;
    }
    const tope = Math.max(...picos) || 1;
    return { picos: picos.map((p) => p / tope), duracion: audio.duration };
  } catch {
    return null;
  } finally {
    ctx.close();
  }
}

export async function abrirMedidor(alNivel) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const Contexto = window.AudioContext || window.webkitAudioContext;
  const ctx = new Contexto();
  const analizador = ctx.createAnalyser();
  analizador.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analizador);
  const onda = new Float32Array(analizador.fftSize);
  let cuadro;
  let ultimo = 0;
  const medir = (t) => {
    cuadro = requestAnimationFrame(medir);
    if (t - ultimo < 66) return;
    ultimo = t;
    analizador.getFloatTimeDomainData(onda);
    let suma = 0;
    let pico = 0;
    for (const v of onda) {
      suma += v * v;
      pico = Math.max(pico, Math.abs(v));
    }
    alNivel({ rms: Math.sqrt(suma / onda.length), pico });
  };
  cuadro = requestAnimationFrame(medir);
  return () => {
    cancelAnimationFrame(cuadro);
    stream.getTracks().forEach((p) => p.stop());
    ctx.close();
  };
}

export function valorarNivel({ rms, pico }) {
  if (pico >= 0.98) return { clave: "saturado", texto: "Saturado: aléjate un poco del micrófono" };
  if (rms < 0.008) return { clave: "bajo", texto: "No se escucha: acércate o sube el volumen del micrófono" };
  if (rms < 0.03) return { clave: "bajo", texto: "Muy bajo: acércate al micrófono" };
  return { clave: "bien", texto: "Buen nivel: ya puedes grabar" };
}
