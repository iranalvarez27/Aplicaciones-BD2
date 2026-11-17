import { useEffect, useRef, useState } from "react";
import { iniciarGrabacion } from "./microfono";
import { LIMITES } from "./formato";

const [MINIMO, MAXIMO] = LIMITES.grabacion;

export function useGrabacion({ onToma, onError }) {
  const [sesion, setSesion] = useState(null);
  const [segundos, setSegundos] = useState(0);
  const analizadorRef = useRef(null);
  const iniciando = useRef(false);

  useEffect(() => {
    if (!sesion) return;
    const inicio = Date.now();
    const reloj = setInterval(() => {
      const s = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(s);
      if (s >= MAXIMO) sesion.detener();
    }, 250);
    return () => clearInterval(reloj);
  }, [sesion]);

  useEffect(() => () => sesion?.cancelar(), [sesion]);

  const alternar = async () => {
    if (sesion) {
      sesion.detener();
      return;
    }
    if (iniciando.current) return;
    iniciando.current = true;
    try {
      const nueva = await iniciarGrabacion();
      analizadorRef.current = nueva.analizador;
      setSegundos(0);
      setSesion(nueva);
      iniciando.current = false;
      const toma = await nueva.terminado;
      if (toma) onToma(toma);
    } catch (e) {
      onError(e.name === "NotAllowedError" ? "Permite el acceso al micrófono para grabar." : `No se pudo grabar: ${e.message}`);
    } finally {
      iniciando.current = false;
      analizadorRef.current = null;
      setSesion(null);
    }
  };

  return {
    grabando: !!sesion,
    segundos,
    listo: segundos >= MINIMO,
    minimo: MINIMO,
    maximo: MAXIMO,
    analizadorRef,
    alternar,
    cancelar: () => sesion?.cancelar(),
  };
}
