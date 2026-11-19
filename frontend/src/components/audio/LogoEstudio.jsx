import React from "react";

const BARRAS = [
  { x: 14.2, alto: 8 },
  { x: 19.6, alto: 16 },
  { x: 25, alto: 24 },
  { x: 30.4, alto: 14 },
  { x: 35.8, alto: 8 },
];

export default function LogoEstudio({ size = 52 }) {
  return (
    <svg className="logo-svg" width={size} height={size} viewBox="0 0 52 52" aria-hidden="true">
      <circle cx="26" cy="26" r="19.5" fill="none" stroke="#ffffff" strokeWidth="3" />
      <circle cx="26" cy="26" r="14.5" fill="none" stroke="#ffffff" strokeWidth="1" opacity=".4" />
      {BARRAS.map((b, i) => (
        <rect
          key={b.x}
          className="logo-barra"
          style={{ animationDelay: `${i * 0.12}s` }}
          x={b.x}
          y={26 - b.alto / 2}
          width="3.4"
          height={b.alto}
          rx="1.7"
          fill="#fff"
        />
      ))}
    </svg>
  );
}
