import React, { useState } from "react";
import { Download, Music, Pause, Play, Trash2, Upload } from "lucide-react";
import OndaAudio from "./OndaAudio";
import { tiempo } from "./formato";

function Tile({ sonando }) {
  return (
    <span className={"fuente-tile" + (sonando ? " is-sonando" : "")} aria-hidden="true">
      {sonando ? (
        <span className="eq">
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : (
        <Music size={30} />
      )}
    </span>
  );
}

export default function FuenteAudio({
  file,
  preview,
  duracion,
  limites,
  bloqueada,
  compacta,
  sinZona,
  onda,
  tramos,
  posicion,
  onBuscar,
  onTiempo,
  onSeleccionar,
  onEliminar,
  playerRef,
  onPlay,
  onStop,
  onDuracion,
}) {
  const [sonando, setSonando] = useState(false);
  const alternar = () => {
    const a = playerRef?.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };
  const grabada = file?.name?.startsWith("toma-");
  const [minimo, maximo] = limites;
  const fueraDeRango = duracion != null && (duracion < minimo || duracion > maximo);
  return (
    <div className="fuente">
      {!sinZona && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = bloqueada ? "none" : "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (!bloqueada && e.dataTransfer.files.length) onSeleccionar(e.dataTransfer.files[0]);
          }}
          className={"fuente-drop" + (file ? " has-file" : "") + (bloqueada ? " is-busy" : "") + (compacta ? " is-compact" : "")}
        >
          {file ? (
            <Tile sonando={sonando} />
          ) : (
            <span className="fuente-tile is-subir" aria-hidden="true">
              <Upload size={compacta ? 22 : 30} />
            </span>
          )}
          <span>
            <strong title={file?.name}>{file?.name || (compacta ? "…o sube una toma grabada" : "Suelta aquí tu audio")}</strong>
            <small>
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB${duracion != null ? ` · ${tiempo(duracion)}` : ""} · clic para cambiar`
                : "MP3 · WAV · FLAC · OGG · M4A · máx. 50 MB"}
            </small>
          </span>
          {!file && !compacta && <span className="fuente-elegir">Elegir archivo</span>}
          <input
            type="file"
            accept=".mp3,.wav,.ogg,.flac,.m4a"
            disabled={bloqueada}
            className="sr-only"
            aria-label="Seleccionar audio"
            onChange={(e) => {
              onSeleccionar(e.target.files?.[0] || null);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {preview && (
        <>
          {sinZona && file && (
            <div className="toma-disco">
              <Tile sonando={sonando} />
              <span>
                <strong title={file.name}>{file.name}</strong>
                <small>
                  {(file.size / 1024 / 1024).toFixed(2)} MB{duracion != null ? ` · ${tiempo(duracion)}` : ""}
                </small>
              </span>
            </div>
          )}
          <OndaAudio picos={onda?.picos} duracion={duracion ?? onda?.duracion} tramos={tramos} posicion={posicion} onBuscar={onBuscar} />
          <audio
            key={preview}
            ref={playerRef}
            src={preview}
            preload="metadata"
            onPlay={(e) => {
              setSonando(true);
              onPlay(e.currentTarget);
            }}
            onPause={() => {
              setSonando(false);
              onStop();
            }}
            onEnded={() => {
              setSonando(false);
              onStop();
            }}
            onTimeUpdate={(e) => onTiempo?.(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => onDuracion(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : null)}
            className="fuente-player"
            aria-label="Escuchar tu audio"
          />
          <div className="fuente-controles">
            <button type="button" className="fuente-play" onClick={alternar} aria-label={sonando ? "Pausar tu audio" : "Reproducir tu audio"} aria-pressed={sonando}>
              {sonando ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>
            <span className="fuente-tiempo mono">
              {tiempo(posicion || 0)} / {duracion != null ? tiempo(duracion) : "--:--"}
            </span>
          </div>
          {fueraDeRango && (
            <p className="estudio-aviso" role="status">
              Esta toma dura {tiempo(duracion)}; para este modo debe durar entre {tiempo(minimo)} y {tiempo(maximo)}.
            </p>
          )}
          <div className="fuente-acciones">
            {grabada && (
              <a className="estudio-btn is-mini" href={preview} download={file.name}>
                <Download size={13} aria-hidden="true" /> Descargar toma
              </a>
            )}
            <button type="button" className="estudio-btn is-mini is-peligro" onClick={onEliminar} disabled={bloqueada}>
              <Trash2 size={13} aria-hidden="true" /> {grabada ? "Eliminar grabación" : "Quitar audio"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
