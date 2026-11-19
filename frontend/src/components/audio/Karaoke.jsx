import React, { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicVocal, Pause, Play, X } from "lucide-react";
import { letraDe } from "./api";
import { tiempo } from "./formato";
import Portada from "./Portada";

const PAUSA_MANUAL_MS = 4000;

export default function Karaoke({ cancion, grabando, onCantar, onCerrar, orden = 0, ordenPausa = 0, onSonando }) {
  const [letra, setLetra] = useState(undefined);
  const [sonando, setSonando] = useState(false);
  const [posicion, setPosicion] = useState(0);
  const [posGrabando, setPosGrabando] = useState(0);
  const cajaLetra = useRef(null);
  const manualHasta = useRef(0);
  const audio = useRef(null);
  const id = cancion?.track_id;

  useEffect(() => {
    setLetra(undefined);
    setSonando(false);
    setPosicion(0);
    audio.current?.pause();
    if (!cancion) return;
    let vigente = true;
    letraDe(cancion.titulo, cancion.artista, cancion.duracion_s).then((l) => vigente && setLetra(l));
    return () => {
      vigente = false;
    };
  }, [id]);

  useEffect(() => {
    if (!grabando) return;
    audio.current?.pause();
    const inicio = Date.now();
    setPosGrabando(0);
    const reloj = setInterval(() => setPosGrabando((Date.now() - inicio) / 1000), 200);
    return () => clearInterval(reloj);
  }, [grabando]);

  const sincronizada = letra?.sincronizada?.length ? letra.sincronizada : null;
  const pos = grabando ? posGrabando : posicion;
  const actual = useMemo(() => {
    if (!sincronizada) return -1;
    let i = -1;
    for (let k = 0; k < sincronizada.length && sincronizada[k].t <= pos + 0.15; k++) i = k;
    return i;
  }, [sincronizada, pos]);

  useEffect(() => {
    const caja = cajaLetra.current;
    const linea = caja?.querySelector(".is-actual");
    if (!caja || !linea || Date.now() < manualHasta.current) return;
    caja.scrollTo({ top: linea.offsetTop - caja.clientHeight / 2 + linea.clientHeight / 2, behavior: "smooth" });
  }, [actual]);
  const lecturaManual = () => {
    manualHasta.current = Date.now() + PAUSA_MANUAL_MS;
  };

  useEffect(() => {
    if (!orden || grabando) return;
    const a = audio.current;
    if (!a) return;
    a.play().catch(() => {});
  }, [orden]);

  useEffect(() => {
    if (ordenPausa) audio.current?.pause();
  }, [ordenPausa]);

  const alternar = () => {
    const a = audio.current;
    if (!a || grabando) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };
  const ir = (t) => {
    const a = audio.current;
    if (!a || grabando || !cancion?.audio_url) return;
    a.currentTime = t;
    a.play().catch(() => {});
  };

  if (!cancion) {
    return (
      <aside className="karaoke is-vacio" aria-label="Karaoke">
        <MicVocal size={34} strokeWidth={1.5} aria-hidden="true" />
        <h2>Elige una canción</h2>
        <p>Pulsa cualquier canción del repertorio para ver su letra y cantarla.</p>
      </aside>
    );
  }

  return (
    <aside className={"karaoke" + (grabando ? " is-grabando" : "")} aria-label={`Karaoke: ${cancion.titulo}`}>
      <div className="karaoke-top">
        <span className="karaoke-sello">{grabando ? "● Cantando" : "Karaoke"}</span>
        {sincronizada && <span className="estudio-chip">Letra sincronizada</span>}
        <button type="button" className="karaoke-cerrar" onClick={onCerrar} aria-label="Ocultar el panel de letra" title="Ocultar el panel de letra">
          <X size={16} />
        </button>
      </div>
      <div className="karaoke-cabeza">
        <Portada titulo={cancion.titulo} artista={cancion.artista} className="grande" />
        <div>
          <h2>{cancion.titulo}</h2>
          <p>
            {cancion.artista}
            {cancion.duracion_s ? ` · ${tiempo(cancion.duracion_s)}` : ""}
          </p>
        </div>
      </div>

      {cancion.audio_url && !!cancion.duracion_s && (
        <div className="karaoke-progreso">
          <span className="mono">{tiempo(posicion)}</span>
          <input
            type="range"
            min={0}
            max={cancion.duracion_s}
            step={0.1}
            value={Math.min(posicion, cancion.duracion_s)}
            style={{ "--pct": `${Math.min(100, (100 * posicion) / cancion.duracion_s)}%` }}
            disabled={grabando}
            aria-label="Posición de la canción"
            onChange={(e) => {
              if (audio.current) audio.current.currentTime = Number(e.target.value);
            }}
          />
          <span className="mono">{tiempo(cancion.duracion_s)}</span>
        </div>
      )}

      <div className={"karaoke-letra" + (!sincronizada && !letra?.plana ? " is-vacia" : "")} aria-live="polite" ref={cajaLetra} onWheel={lecturaManual} onTouchMove={lecturaManual} tabIndex={0} aria-label="Letra de la canción">
        {letra === undefined && <p className="karaoke-aviso">Buscando la letra…</p>}
        {letra === null && <p className="karaoke-aviso">Letra no disponible para esta canción. Aun así puedes grabarla y analizarla.</p>}
        {sincronizada &&
          sincronizada.map((l, n) => (
            <button
              key={n}
              type="button"
              className={"linea" + (n === actual ? " is-actual" : n < actual ? " is-pasada" : "")}
              onClick={() => ir(l.t)}
              disabled={grabando || !cancion.audio_url}
              title={cancion.audio_url && !grabando ? "Escuchar desde aquí" : undefined}
            >
              {l.texto}
            </button>
          ))}
        {letra && !sincronizada && <p className="karaoke-plana">{letra.plana}</p>}
      </div>

      <div className="karaoke-acciones">
        <button type="button" className="estudio-btn is-primario" onClick={onCantar} disabled={grabando}>
          <Mic size={17} aria-hidden="true" /> {grabando ? "Grabando…" : "Cantar esta"}
        </button>
        {cancion.audio_url && (
          <button type="button" className="karaoke-play" onClick={alternar} disabled={grabando} aria-label={sonando ? "Pausar la original" : "Escuchar la original"} aria-pressed={sonando}>
            {sonando ? <Pause size={18} /> : <Play size={18} />}
          </button>
        )}
      </div>
      {cancion.audio_url && (
        <audio
          ref={audio}
          src={cancion.audio_url}
          preload="none"
          onPlay={() => {
            setSonando(true);
            onSonando?.(cancion.track_id);
          }}
          onPause={() => {
            setSonando(false);
            onSonando?.(null);
          }}
          onEnded={() => {
            setSonando(false);
            onSonando?.(null);
          }}
          onTimeUpdate={(e) => setPosicion(e.currentTarget.currentTime)}
        />
      )}
      <small className="karaoke-fuente">{letra?.fuente ? `Letra vía ${letra.fuente} · ` : ""}portada vía iTunes</small>
    </aside>
  );
}
