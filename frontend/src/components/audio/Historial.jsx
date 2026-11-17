import React from "react";
import { History, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

const fecha = (iso) =>
  new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Historial({ items, onAbrir, onBorrar, onVaciar }) {
  return (
    <div>
      <div className="estudio-card-title">
        <History size={17} aria-hidden="true" />
        <h2>Historial de análisis</h2>
        {items.length > 0 && (
          <button type="button" className="estudio-btn is-mini" onClick={onVaciar}>
            <Trash2 size={13} aria-hidden="true" /> Vaciar
          </button>
        )}
      </div>
      {!items.length ? (
        <p className="estudio-vacio">Aún no hay análisis. Los últimos 12 se guardan en este navegador.</p>
      ) : (
        <ul className="historial-lista">
          {items.map((x) => (
            <li key={x.id}>
              <button type="button" className="historial-item" onClick={() => onAbrir(x)} title="Volver a ver este resultado">
                {x.hay ? <ShieldAlert size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
                <span>
                  <strong>{x.archivo}</strong>
                  <small>
                    {fecha(x.fecha)} · {x.hay ? x.titulos.join(", ") : "sin coincidencias"}
                  </small>
                </span>
              </button>
              <button type="button" className="historial-borrar" onClick={() => onBorrar(x.id)} aria-label={`Quitar ${x.archivo} del historial`}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="estudio-nota">El historial guarda el resultado, no el audio: para volver a escuchar, carga el archivo otra vez.</p>
    </div>
  );
}
