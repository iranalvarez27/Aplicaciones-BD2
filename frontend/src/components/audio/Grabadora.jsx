import React, { useEffect, useRef } from "react";
import { Mic, Square, X } from "lucide-react";
import NivelMicrofono from "./NivelMicrofono";
import { tiempo } from "./formato";

const BARRAS = 56;

function dibujar(canvas, analizador, picos) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const onda = new Float32Array(analizador.fftSize);
  analizador.getFloatTimeDomainData(onda);
  ctx.clearRect(0, 0, w, h);

  const paso = w / BARRAS;
  const ancho = Math.max(3, paso * 0.55);
  const tramo = Math.floor(onda.length / BARRAS);
  ctx.fillStyle = "#1ed760";
  for (let b = 0; b < BARRAS; b++) {
    let suma = 0;
    for (let i = b * tramo; i < (b + 1) * tramo; i++) suma += onda[i] * onda[i];
    const nivel = Math.min(1, Math.sqrt(suma / tramo) * 7);
    picos[b] = Math.max(nivel, picos[b] * 0.9);
    const alto = Math.max(ancho, picos[b] * h * 0.95);
    ctx.globalAlpha = 0.45 + 0.55 * picos[b];
    ctx.beginPath();
    ctx.roundRect(b * paso + (paso - ancho) / 2, (h - alto) / 2, ancho, alto, ancho / 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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
  return <canvas ref={lienzo} width={840} height={96} className="cabina-osc" aria-hidden="true" />;
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
        <span className="cabina-luz" /> {grabando ? "GRABANDO" : "LISTO PARA GRABAR"}
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
        {grabando ? <Square size={30} fill="currentColor" /> : <Mic size={42} />}
      </button>
      {grabando ? (
        <>
          <Osciloscopio grabacion={grabacion} />
          <EstadoToma grabacion={grabacion} />
        </>
      ) : (
        <div className="cabina-guia">
          <h3>Toca el micrófono para grabar</h3>
          <p>
            Canta de <strong>5 s a 2 min</strong>, a capela o con la pista de fondo.
            <br />
            Con la letra clara y cerca del micrófono.
          </p>
        </div>
      )}
      {!grabando && <NivelMicrofono grabando={grabando} deshabilitado={deshabilitada} />}
    </div>
  );
}
