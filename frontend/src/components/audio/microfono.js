const SR = 22050;

function escribirWav(muestras, sr) {
  const buffer = new ArrayBuffer(44 + muestras.length * 2);
  const v = new DataView(buffer);
  const texto = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  texto(0, "RIFF");
  v.setUint32(4, 36 + muestras.length * 2, true);
  texto(8, "WAVE");
  texto(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  texto(36, "data");
  v.setUint32(40, muestras.length * 2, true);
  for (let i = 0; i < muestras.length; i++) {
    const s = Math.max(-1, Math.min(1, muestras[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export async function blobAWav(blob) {
  const Contexto = window.AudioContext || window.webkitAudioContext;
  const ctx = new Contexto();
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
    const offline = new OfflineAudioContext(1, Math.ceil(audio.duration * SR), SR);
    const fuente = offline.createBufferSource();
    fuente.buffer = audio;
    fuente.connect(offline.destination);
    fuente.start();
    const mono = await offline.startRendering();
    return escribirWav(mono.getChannelData(0), SR);
  } finally {
    ctx.close();
  }
}

export async function iniciarGrabacion() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
    throw new Error("este navegador no permite grabar audio (usa Chrome, Edge o Firefox en http://localhost)");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true },
  });
  const Contexto = window.AudioContext || window.webkitAudioContext;
  const monitor = new Contexto();
  const analizador = monitor.createAnalyser();
  analizador.fftSize = 2048;
  monitor.createMediaStreamSource(stream).connect(analizador);

  const grabador = new MediaRecorder(stream);
  const partes = [];
  let cancelada = false;
  grabador.ondataavailable = (e) => e.data.size && partes.push(e.data);
  const liberar = () => {
    stream.getTracks().forEach((t) => t.stop());
    monitor.close();
  };
  const terminado = new Promise((resolve, reject) => {
    grabador.onstop = async () => {
      liberar();
      if (cancelada) return resolve(null);
      try {
        const wav = await blobAWav(new Blob(partes, { type: grabador.mimeType }));
        const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        resolve(new File([wav], `toma-${fecha}.wav`, { type: "audio/wav" }));
      } catch (e) {
        reject(e);
      }
    };
  });
  grabador.start();
  return {
    analizador,
    terminado,
    detener: () => grabador.state !== "inactive" && grabador.stop(),
    cancelar: () => {
      cancelada = true;
      if (grabador.state !== "inactive") grabador.stop();
    },
  };
}
