import React, { useEffect, useRef, useState } from "react";
import { Gauge } from "lucide-react";
import { abrirMedidor, valorarNivel } from "./onda";

export default function NivelMicrofono({ grabando, deshabilitado }) {
  const [activo, setActivo] = useState(false);
  const [nivel, setNivel] = useState({ rms: 0, pico: 0 });
  const [fallo, setFallo] = useState("");
  const cerrar = useRef(null);

  const detener = () => {
    cerrar.current?.();
    cerrar.current = null;
    setActivo(false);
    setNivel({ rms: 0, pico: 0 });
  };

  useEffect(() => () => cerrar.current?.(), []);
  useEffect(() => {
    if (grabando && cerrar.current) {
      cerrar.current();
      cerrar.current = null;
      setActivo(false);
    }
  }, [grabando]);

  const alternar = async () => {
    if (activo) return detener();
    setFallo("");
    try {
      cerrar.current = await abrirMedidor(setNivel);
      setActivo(true);
    } catch (e) {
      setFallo(e.name === "NotAllowedError" ? "Permite el acceso al micrófono para probarlo." : "No se pudo abrir el micrófono.");
    }
  };

  const valoracion = activo ? valorarNivel(nivel) : null;
  const ancho = Math.min(100, Math.round(nivel.rms * 500));
  return (
    <div className="nivel-mic">
      <button type="button" className="estudio-btn is-mini" onClick={alternar} disabled={deshabilitado || grabando} aria-pressed={activo}>
        <Gauge size={13} aria-hidden="true" /> {activo ? "Detener prueba" : "Probar micrófono"}
      </button>
      {activo && (
        <div className="nivel-barra" role="meter" aria-label="Nivel del micrófono" aria-valuemin={0} aria-valuemax={100} aria-valuenow={ancho}>
          <i style={{ width: `${ancho}%` }} className={valoracion?.clave} />
          <b style={{ left: "60%" }} aria-hidden="true" />
        </div>
      )}
      {valoracion && <p className={"nivel-texto " + valoracion.clave}>{valoracion.texto}</p>}
      {fallo && <p className="nivel-texto bajo">{fallo}</p>}
    </div>
  );
}
