import React from "react";
import { tiempo } from "./formato";


export default function OndaAudio({ picos, duracion, tramos = [], posicion = 0, onBuscar }) {
  if (!picos?.length || !duracion) return null;
  const n = picos.length;
  const x = (s) => `${Math.min(100, Math.max(0, (100 * s) / duracion))}%`;
  const buscar = (e) => {
    if (!onBuscar) return;
    const caja = e.currentTarget.getBoundingClientRect();
    onBuscar(Math.min(duracion, Math.max(0, ((e.clientX - caja.left) / caja.width) * duracion)));
  };
  return (
    <div className="onda" onClick={buscar} role={onBuscar ? "slider" : "img"} aria-label="Forma de onda del audio" aria-valuemin={0} aria-valuemax={Math.round(duracion)} aria-valuenow={Math.round(posicion)}>
      <svg viewBox={`0 0 ${n} 40`} preserveAspectRatio="none" aria-hidden="true">
        {picos.map((p, i) => (
          <rect key={i} x={i + 0.18} y={20 - Math.max(1, p * 19)} width="0.64" height={Math.max(2, p * 38)} rx="0.3" />
        ))}
      </svg>
      {tramos.map((t) => (
        <i
          key={`${t.inicio_s}:${t.fin_s}:${t.color}`}
          className="onda-tramo"
          style={{ left: x(t.inicio_s), width: `calc(${x(t.fin_s)} - ${x(t.inicio_s)})`, "--color": t.color }}
          title={`${t.titulo}: ${tiempo(t.inicio_s)}–${tiempo(t.fin_s)}`}
        />
      ))}
      <b className="onda-cursor" style={{ left: x(posicion) }} />
    </div>
  );
}
