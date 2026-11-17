import React from "react";
import { AudioWaveform, Captions, Pause, Play, ShieldAlert, ShieldCheck } from "lucide-react";
import { claveFragmento, COLORES, etiquetaTipo, tiempo } from "./formato";

function Etiqueta({ c }) {
  return <span className={"etiqueta-tipo" + (c.tipo === "cancion_cantada" ? " is-cantada" : "")}>{etiquetaTipo(c)}</span>;
}

export default function ResultadoCopyright({ resultado, reproduciendo, onEscuchar, onSincronizar, tiempoS, onBuscar }) {
  const pistas = new Map();
  for (const c of resultado.coincidencias) {
    if (!pistas.has(c.track_id)) pistas.set(c.track_id, []);
    pistas.get(c.track_id).push(c);
  }
  const hay = resultado.coincidencias.length > 0;
  return (
    <>
      <div className={"veredicto" + (hay ? " is-alerta" : " is-limpio")} role="status">
        {hay ? <ShieldAlert size={26} aria-hidden="true" /> : <ShieldCheck size={26} aria-hidden="true" />}
        <div>
          <strong>{hay ? "Posible contenido protegido" : "Sin coincidencias"}</strong>
          <span>{resultado.conclusion}</span>
        </div>
      </div>

      <ul className="leyenda-tipos">
        <li>
          <span className="etiqueta-tipo">Misma grabación</span> tu audio contiene un trozo de la canción original.
        </li>
        <li>
          <span className="etiqueta-tipo is-cantada">Canción cantada</span> alguien canta una canción del repertorio (por letra o melodía).
        </li>
      </ul>

      <dl className="displays">
        {[
          ["Canciones", pistas.size],
          ["Tramos", resultado.coincidencias.length],
          ["Duración", tiempo(resultado.duracion_s)],
          ["Análisis", ((resultado.metricas.total_ms ?? resultado.metricas.tiempo_ms) / 1000).toFixed(1) + " s"],
        ].map(([nombre, valor]) => (
          <div key={nombre} className="display">
            <dt>{nombre}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>

      <p className="pasos-resumen">
        <span>Subida y lectura del audio</span>
        {resultado.metricas.tiempo_ms != null && <span>Grabaciones {(resultado.metricas.tiempo_ms / 1000).toFixed(1)} s</span>}
        {resultado.metricas.letra_ms != null && <span>Letra {(resultado.metricas.letra_ms / 1000).toFixed(1)} s</span>}
        {resultado.coincidencias.some((c) => /melod/i.test(c.metodo_verificacion || "")) && <span>Melodía usada como respaldo</span>}
      </p>

      <section className="estudio-card">
        <div className="estudio-card-title">
          <AudioWaveform size={17} aria-hidden="true" />
          <h2>Línea de tiempo</h2>
          <span className="estudio-sub">Pulsa un tramo para escucharlo</span>
        </div>
        {!pistas.size && <p className="estudio-vacio">Ningún fragmento superó los criterios de confirmación.</p>}
        <div className="pistas">
          {[...pistas.values()].map((eventos, i) => (
            <div key={eventos[0].track_id} className="pista">
              <p className="pista-nombre" title={`${eventos[0].titulo} · ${eventos[0].artista}`}>
                <i style={{ backgroundColor: COLORES[i % COLORES.length] }} />
                <strong>{eventos[0].titulo}</strong>
                <span>{eventos[0].artista}</span>
                {[...new Set(eventos.map(etiquetaTipo))].map((t) => (
                  <span key={t} className={"etiqueta-tipo" + (t === "Misma grabación" ? "" : " is-cantada")}>
                    {t}
                  </span>
                ))}
              </p>
              <div className="pista-carril">
                {eventos.map((c) => (
                  <button
                    key={`${c.inicio_s}:${c.fin_s}`}
                    type="button"
                    onClick={() => onEscuchar(c)}
                    style={{
                      left: `${(100 * c.inicio_s) / resultado.duracion_s}%`,
                      width: `${(100 * (c.fin_s - c.inicio_s)) / resultado.duracion_s}%`,
                      "--color": COLORES[i % COLORES.length],
                    }}
                    className="pista-clip"
                    title={`${tiempo(c.inicio_s)}–${tiempo(c.fin_s)} · ${c.porcentaje_similitud}% de similitud`}
                    aria-pressed={reproduciendo === claveFragmento(c)}
                    aria-label={`${reproduciendo === claveFragmento(c) ? "Pausar" : "Reproducir"} ${c.titulo} desde ${tiempo(c.inicio_s)}`}
                  >
                    {c.fin_s - c.inicio_s > resultado.duracion_s * 0.1 ? `${c.porcentaje_similitud}%` : ""}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="pista-escala">
          <span>0:00</span>
          <span>{tiempo(resultado.duracion_s)}</span>
        </div>
      </section>

      {resultado.texto_reconocido !== undefined && (
        <section className="estudio-card">
          <div className="estudio-card-title">
            <Captions size={17} aria-hidden="true" />
            <h2>Texto reconocido</h2>
            <span className="estudio-sub">Lo que se entendió de tu voz</span>
          </div>
          {resultado.frases?.length ? (
            <ol className="letra-frases">
              {resultado.frases.map((f) => {
                const activa = tiempoS != null && tiempoS >= f.inicio_s && tiempoS < f.fin_s;
                return (
                  <li key={`${f.inicio_s}:${f.fin_s}`} className={activa ? "is-activa" : ""}>
                    <button type="button" onClick={() => onBuscar?.(f.inicio_s)} disabled={!onBuscar} title="Ir a este momento del audio">
                      <time>{tiempo(f.inicio_s)}</time>
                      <span>{f.texto}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : resultado.texto_reconocido ? (
            <p className="texto-reconocido">{resultado.texto_reconocido}</p>
          ) : (
            <p className="estudio-vacio">No se reconoció letra; si cantas, hazlo con la letra clara y cerca del micrófono.</p>
          )}
        </section>
      )}
      {resultado.metricas?.letra_error && <p className="estudio-aviso">Canción cantada: {resultado.metricas.letra_error}.</p>}

      {hay && (
        <section className="estudio-card">
          <div className="estudio-card-title">
            <h2>Detalle de coincidencias</h2>
            <span className="estudio-chip">
              {resultado.coincidencias.length} {resultado.coincidencias.length === 1 ? "tramo" : "tramos"}
            </span>
          </div>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  {["En tu audio", "Canción de referencia", "En la referencia", "Similitud", "Escuchar"].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultado.coincidencias.map((c) => {
                  const sonando = reproduciendo === claveFragmento(c);
                  return (
                    <tr key={claveFragmento(c)}>
                      <td className="mono">
                        {tiempo(c.inicio_s)}–{tiempo(c.fin_s)}
                      </td>
                      <td>
                        <strong>{c.titulo}</strong>
                        <small>
                          {c.artista}
                          {c.fuente ? ` · ${c.fuente}` : ""}
                        </small>
                        <Etiqueta c={c} />
                      </td>
                      <td className="mono">
                        {tiempo(c.original_inicio_s)}–{tiempo(c.original_fin_s)}
                      </td>
                      <td>
                        <span className="medidor" style={{ "--valor": `${c.porcentaje_similitud}%` }}>
                          {c.porcentaje_similitud}%
                        </span>
                        {c.tipo === "cancion_cantada" ? (
                          c.frases != null && <small>{c.frases} {c.frases === 1 ? "frase" : "frases"}</small>
                        ) : (
                          c.votos != null && <small>{c.votos} votos temporales</small>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => onEscuchar(c)}
                          className="estudio-btn is-mini"
                          aria-pressed={sonando}
                          aria-label={sonando ? "Pausar tu audio" : "Reproducir tu audio"}
                        >
                          {sonando ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
                          {sonando ? "Pausar" : "Tu audio"}
                        </button>
                        {c.audio_url && (
                          <audio
                            controls
                            onPlay={(e) => onSincronizar(e.currentTarget)}
                            preload="none"
                            src={`${c.audio_url}#t=${c.original_inicio_s},${c.original_fin_s}`}
                            className="ref-player"
                            aria-label={`Referencia: ${c.titulo}`}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!!resultado.segmentos?.length && (
        <details className="estudio-card candidatos">
          <summary>Candidatos por histograma ({resultado.segmentos.length} bloques)</summary>
          <p className="estudio-nota">
            La similitud BoAW preselecciona candidatos; la alineación temporal y la secuencia verifican cada coincidencia.
          </p>
          {resultado.segmentos.map((segmento) => (
            <div key={segmento.inicio_s} className="candidato">
              <strong className="mono">
                {tiempo(segmento.inicio_s)}–{tiempo(segmento.fin_s)}
              </strong>{" "}
              · {segmento.coincidencias.length} coincidencias con evidencia temporal
              <p>
                {segmento.candidatos
                  .slice(0, 5)
                  .map((c) => `${c.titulo} (BoAW: ${c.porcentaje_similitud ?? (100 * c.similitud).toFixed(2)}%)`)
                  .join(" · ") || "Sin candidatos"}
              </p>
            </div>
          ))}
        </details>
      )}
    </>
  );
}
