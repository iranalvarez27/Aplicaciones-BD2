import React, { useEffect, useState } from "react";
import { portadaDe } from "./api";

const DEGRADADOS = [
  ["#ef3a3a", "#ffd1d1"],
  ["#7c5cff", "#1b1b1b"],
  ["#ff4f8b", "#7c5cff"],
  ["#3ab7e8", "#1c6fb0"],
  ["#f0a04b", "#8a4b1e"],
  ["#1ed760", "#0b5f2e"],
];

function degradado(texto) {
  let h = 0;
  for (const ch of texto) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  const [a, b] = DEGRADADOS[h % DEGRADADOS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export default function Portada({ titulo, artista, className = "" }) {
  const clave = `${artista}|${titulo}`;
  const [estado, setEstado] = useState({ clave: "", url: null, falla: false });
  useEffect(() => {
    let vigente = true;
    portadaDe(titulo, artista).then((url) => vigente && setEstado({ clave, url, falla: false }));
    return () => {
      vigente = false;
    };
  }, [clave, titulo, artista]);
  const url = estado.clave === clave && !estado.falla ? estado.url : null;
  return (
    <span className={"portada " + className} style={{ background: degradado(`${artista}${titulo}`) }} aria-hidden="true">
      {url ? (
        <img src={url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setEstado((e) => ({ ...e, falla: true }))} />
      ) : (
        <b>{(titulo || "?").trim()[0]?.toUpperCase()}</b>
      )}
    </span>
  );
}
