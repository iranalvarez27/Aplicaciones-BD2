import React, { useState } from "react";
import { etiquetaTipo, tiempo } from "./formato";

export default function Informe({ resultado }) {
  const m = resultado.metricas || {};
  const [generado] = useState(() => new Date().toLocaleString("es-PE"));
  return (
    <article className="informe-imprimible" aria-hidden="true">
      <h1>Informe de detección de copyright</h1>
      <p className="informe-fecha">Generado el {generado} · Audio de {tiempo(resultado.duracion_s)}</p>
      <h2>Veredicto</h2>
      <p>{resultado.conclusion}</p>

      {resultado.coincidencias.length > 0 && (
        <>
          <h2>Coincidencias</h2>
          <table>
            <thead>
              <tr>
                <th>En el audio</th>
                <th>Canción</th>
                <th>En la original</th>
                <th>Cómo se encontró</th>
                <th>Similitud</th>
              </tr>
            </thead>
            <tbody>
              {resultado.coincidencias.map((c) => (
                <tr key={`${c.track_id}:${c.inicio_s}:${c.fin_s}`}>
                  <td>
                    {tiempo(c.inicio_s)}–{tiempo(c.fin_s)}
                  </td>
                  <td>
                    {c.titulo} ({c.artista})
                  </td>
                  <td>
                    {tiempo(c.original_inicio_s)}–{tiempo(c.original_fin_s)}
                  </td>
                  <td>{etiquetaTipo(c)}</td>
                  <td>{c.porcentaje_similitud}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {resultado.texto_reconocido && (
        <>
          <h2>Texto reconocido</h2>
          <p>{resultado.texto_reconocido}</p>
        </>
      )}

      <h2>Tiempos</h2>
      <p>
        Total {((m.total_ms ?? m.tiempo_ms) / 1000).toFixed(1)} s
        {m.tiempo_ms != null && m.total_ms != null ? ` · grabaciones ${(m.tiempo_ms / 1000).toFixed(1)} s` : ""}
        {m.letra_ms != null ? ` · letra ${(m.letra_ms / 1000).toFixed(1)} s` : ""}
      </p>
      <p className="informe-aviso">{resultado.aviso}</p>
    </article>
  );
}
