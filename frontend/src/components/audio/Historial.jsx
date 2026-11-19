import React from "react";
import { History, ShieldCheck, Trash2 } from "lucide-react";
import Portada from "./Portada";

const fecha = (iso) =>
  new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function Portadas({ item }) {
  const vistas = new Map();
  for (const c of item.resultado?.coincidencias || []) if (!vistas.has(c.track_id)) vistas.set(c.track_id, c);
  const canciones = [...vistas.values()].slice(0, 3);
  if (!canciones.length) {
    return (
      <span className="historial-escudo" aria-hidden="true">
        <ShieldCheck size={20} />
      </span>
    );
  }
  return (
    <span className="historial-portadas" aria-hidden="true">
      {canciones.map((c) => (
        <Portada key={c.track_id} titulo={c.titulo} artista={c.artista} />
      ))}
    </span>
  );
}

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
                <Portadas item={x} />
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
