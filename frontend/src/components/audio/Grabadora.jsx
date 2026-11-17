import React, { useEffect, useRef } from "react";
import { Mic, Square, X } from "lucide-react";
import NivelMicrofono from "./NivelMicrofono";
import { tiempo } from "./formato";

const BARRAS = 24;

function dibujar(canvas, analizador, picos) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const onda = new Float32Array(analizador.fftSize);
  analizador.getFloatTimeDomainData(onda);
  ctx.clearRect(0, 0, w, h);

  const ancho = w / BARRAS;
  const tramo = Math.floor(onda.length / BARRAS);
  for (let b = 0; b < BARRAS; b++) {
    let suma = 0;
    for (let i = b * tramo; i < (b + 1) * tramo; i++) suma += onda[i] * onda[i];
    const nivel = Math.min(1, Math.sqrt(suma / tramo) * 6);
    picos[b] = Math.max(nivel, picos[b] * 0.92);
    const alto = Math.max(3, picos[b] * h * 0.9);
    const g = ctx.createLinearGradient(0, h, 0, h - alto);
    g.addColorStop(0, "#3dd6c3");
    g.addColorStop(0.65, "#ffb547");
    g.addColorStop(1, "#ff5a7a");
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(b * ancho + 2, h - alto, ancho - 4, alto);
  }
  ctx.globalAlpha = 1;

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const y = h / 2 + onda[Math.floor((x / w) * onda.length)] * h * 0.9;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function Osciloscopio({ grabacion }) {
  const lienzo = useRef(null);
  const { grabando, analizadorRef } = grabacion;
  useEffect(() => {
    if (!grabando) return;
    const picos = new Array(BARRAS).fill(0);
    let cuadro;
    const animar = () => {
      if (lienzo.current && analizadorRef.current) dibujar(lienzo.current, analizadorRef.current, picos);
      cuadro = requestAnimationFrame(animar);
    };
    animar();
    return () => cancelAnimationFrame(cuadro);
  }, [grabando, analizadorRef]);
  return <canvas ref={lienzo} width={420} height={90} className="cabina-osc" aria-hidden="true" />;
}

export function EstadoToma({ grabacion }) {
  const { segundos, listo, minimo, maximo, cancelar } = grabacion;
  return (
    <>
      <div className="cabina-reloj" role="timer" aria-live="off">
        <strong>{tiempo(segundos)}</strong>
        <span className={listo ? "is-ok" : ""}>{listo ? "Listo, detén cuando quieras" : `Mínimo ${minimo} s · sigue cantando`}</span>
      </div>
      <div className="cabina-progreso" aria-hidden="true">
        <i style={{ width: `${Math.min(100, (100 * segundos) / maximo)}%` }} />
        <b style={{ left: `${(100 * minimo) / maximo}%` }} />
      </div>
      <button type="button" className="estudio-btn is-ghost" onClick={cancelar}>
        <X size={14} /> Descartar toma
      </button>
    </>
  );
}

export default function Grabadora({ grabacion, deshabilitada }) {
  const { grabando, alternar } = grabacion;
  return (
    <div className={"cabina" + (grabando ? " is-live" : "")}>
      <div className="cabina-onair" aria-hidden="true">
        <span className="cabina-luz" /> {grabando ? "ON AIR" : "EN ESPERA"}
      </div>
      <button
        type="button"
        className="cabina-mic"
        onClick={alternar}
        disabled={deshabilitada}
        aria-pressed={grabando}
        aria-label={grabando ? "Detener grabación" : "Empezar a grabar"}
      >
        <span className="cabina-anillo" aria-hidden="true" />
        <span className="cabina-anillo is-2" aria-hidden="true" />
        {grabando ? <Square size={30} fill="currentColor" /> : <Mic size={40} />}
      </button>
      {grabando ? (
        <>
          <Osciloscopio grabacion={grabacion} />
          <EstadoToma grabacion={grabacion} />
        </>
      ) : (
        <p className="cabina-guia">
          Pulsa el micrófono y canta de <strong>5 s a 2 min</strong>, a capela o con la pista de fondo.
          <br />
          Canta la letra clara y cerca del micrófono.
        </p>
      )}
      {!grabando && <NivelMicrofono grabando={grabando} deshabilitado={deshabilitada} />}
    </div>
  );
}
