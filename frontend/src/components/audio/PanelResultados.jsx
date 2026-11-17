import React from "react";
import { Check, Download, FileText, Inbox, LoaderCircle, RotateCcw } from "lucide-react";
import ResultadoCopyright from "./ResultadoCopyright";
import Informe from "./Informe";
import { tiempo } from "./formato";

const ETAPAS = [
  ["grabacion", "Buscar la misma grabación en la biblioteca", "Compara el sonido de tu audio con las canciones de la biblioteca."],
  ["letra", "Escuchar la letra y compararla con el repertorio", "Whisper transcribe la voz y se busca la letra en las canciones que se pueden cantar."],
  ["melodia", "Comparar la melodía, solo si la letra no basta", "Respaldo para audios de 10 s o más."],
];

function Marca({ estado }) {
  if (estado === "hecho" || estado === "omitida") return <Check size={15} />;
  if (estado === "activo") return <LoaderCircle size={15} />;
  return <i />;
}

function Pasos({ fase, progreso, transcurrido }) {
  const subiendo = fase === "subiendo";
  const estadoDe = (clave) => {
    if (subiendo) return "espera";
    if (progreso?.[clave]) return progreso[clave];
    return clave === "grabacion" ? "activo" : "espera"; // antes de la primera consulta de avance
  };
  const clase = (e) => (e === "hecho" ? "is-hecho" : e === "omitida" ? "is-omitida" : e === "activo" ? "is-activo" : "is-espera");
  return (
    <ol className="pasos" aria-label="Pasos del análisis">
      <li className={subiendo ? "is-activo" : "is-hecho"}>
        <span className="paso-cabeza">
          <span className="paso-marca">
            <Marca estado={subiendo ? "activo" : "hecho"} />
          </span>
          <em>Paso 1 de 4</em>
        </span>
        <strong>Subir el audio</strong>
        <small>{subiendo ? "Enviando tu audio al servidor…" : "Listo"}</small>
      </li>
      {ETAPAS.map(([clave, titulo, detalle], i) => {
        const estado = estadoDe(clave);
        return (
          <li key={clave} className={clase(estado)}>
            <span className="paso-cabeza">
              <span className="paso-marca">
                <Marca estado={estado} />
              </span>
              <em>Paso {i + 2} de 4</em>
            </span>
            <strong>{titulo}</strong>
            <small>{estado === "hecho" ? "Listo" : estado === "omitida" ? "No hizo falta" : detalle}</small>
          </li>
        );
      })}
      <li className="paso-tiempo">
        <span className="paso-reloj">{tiempo(transcurrido)}</span>
        <span>Suele tardar entre 20 s y 1 min; el primer análisis tarda más porque carga el modelo de voz.</span>
      </li>
    </ol>
  );
}

export default function PanelResultados({ busy, fase, progreso, transcurrido, resultado, desdeHistorial, reproduciendo, tiempoS, onBuscar, onEscuchar, onSincronizar, onNuevo, onExportar }) {
  if (!resultado) {
    return (
      <div className="estudio-espera" role="status" aria-busy={busy}>
        {busy ? (
          <span className="ecualizador" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        ) : (
          <Inbox size={34} strokeWidth={1.5} aria-hidden="true" />
        )}
        <h2>{busy ? "Analizando tu audio" : "Listo para analizar"}</h2>
        {busy ? (
          <Pasos fase={fase} progreso={progreso} transcurrido={transcurrido} />
        ) : (
          <p>Sube un archivo o graba una toma y pulsa «Analizar»: se busca la misma grabación y también si cantas una canción del repertorio.</p>
        )}
      </div>
    );
  }
  return (
    <>
      <div className="estudio-resultado-titulo">
        <h2>Resultado del análisis</h2>
        <div className="estudio-acciones">
          <button type="button" onClick={onNuevo} className="estudio-btn">
            <RotateCcw size={15} aria-hidden="true" /> Nuevo análisis
          </button>
          <button type="button" onClick={() => window.print()} className="estudio-btn">
            <FileText size={15} aria-hidden="true" /> Informe PDF
          </button>
          <button type="button" onClick={onExportar} className="estudio-btn">
            <Download size={15} aria-hidden="true" /> Exportar JSON
          </button>
        </div>
      </div>
      {desdeHistorial && (
        <p className="estudio-explica">Resultado guardado el {new Date(desdeHistorial).toLocaleString("es-PE")} · para escuchar los tramos, carga el audio otra vez</p>
      )}
      <ResultadoCopyright
        resultado={resultado}
        reproduciendo={reproduciendo}
        onEscuchar={onEscuchar}
        onSincronizar={onSincronizar}
        tiempoS={tiempoS}
        onBuscar={onBuscar}
      />
      <p className="estudio-nota is-aviso">{resultado.aviso}</p>
      <Informe resultado={resultado} />
    </>
  );
}
