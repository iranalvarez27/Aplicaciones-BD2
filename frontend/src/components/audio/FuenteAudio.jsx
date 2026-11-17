import React, { useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import OndaAudio from "./OndaAudio";
import { tiempo } from "./formato";

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
          {file ? <i className={"disco-vinilo" + (sonando ? " is-sonando" : "")} aria-hidden="true" /> : <Upload size={22} aria-hidden="true" />}
          <span>
            <strong title={file?.name}>{file?.name || (compacta ? "…o sube una toma grabada" : "Suelta aquí tu audio")}</strong>
            <small>
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB${duracion != null ? ` · ${tiempo(duracion)}` : ""} · clic para cambiar`
                : "MP3 · WAV · FLAC · OGG · M4A · máx. 50 MB"}
            </small>
          </span>
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
              <i className={"disco-vinilo is-mini" + (sonando ? " is-sonando" : "")} aria-hidden="true" />
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
            controls
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
