import React from "react";
import { Headphones, ListMusic, MicVocal, Music2, Trophy } from "lucide-react";
import { tiempo, tono } from "./formato";

function Anillo({ valor }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg className="anillo" viewBox="0 0 84 84" role="img" aria-label={`${valor}% de similitud`}>
      <circle cx="42" cy="42" r={r} className="anillo-fondo" />
      <circle cx="42" cy="42" r={r} className="anillo-valor" strokeDasharray={`${(c * valor) / 100} ${c}`} />
      <text x="42" y="46" textAnchor="middle">
        {Math.round(valor)}%
      </text>
    </svg>
  );
}

export default function AcapellaResultado({ resultado }) {
  const mejor = resultado.coincidencias[0];
  const primero = resultado.ranking[0];
  const destacado = mejor || primero;
  return (
    <>
      {destacado && (
        <section className={"disco" + (mejor ? " is-oro" : " is-duda")} role="status">
          <div className="disco-vinilo" aria-hidden="true">
            <div className="disco-etiqueta">
              <Music2 size={18} />
            </div>
          </div>
          <div className="disco-info">
            <span className="disco-sello">
              {mejor ? (
                <>
                  <Trophy size={14} aria-hidden="true" /> ¡La reconocimos!
                </>
              ) : (
                <>
                  <MicVocal size={14} aria-hidden="true" /> Sin coincidencia clara · la más parecida
                </>
              )}
            </span>
            <h2>{destacado.titulo}</h2>
            <p>{destacado.artista}</p>
            <div className="disco-chips">
              <span className="estudio-chip">{tono(destacado.transposicion_semitonos)}</span>
              <span className="estudio-chip">
                En la original {tiempo(destacado.original_inicio_s)}–{tiempo(destacado.original_fin_s)}
              </span>
              <span className="estudio-chip">Ventaja {(100 * resultado.metricas.ventaja).toFixed(1)} pts</span>
            </div>
            {destacado.audio_url && (
              <audio
                controls
                preload="none"
                src={`${destacado.audio_url}#t=${destacado.original_inicio_s},${destacado.original_fin_s}`}
                className="ref-player"
                aria-label={`Escuchar la original: ${destacado.titulo}`}
              />
            )}
          </div>
          <Anillo valor={destacado.porcentaje_similitud} />
        </section>
      )}
      {!mejor && <p className="estudio-nota">{resultado.conclusion}</p>}

      <dl className="displays">
        {[
          ["Canciones", resultado.metricas.canciones_comparadas],
          ["Voz detectada", `${Math.round(100 * resultado.metricas.voz_detectada)}%`],
          ["Tu toma", tiempo(resultado.duracion_s)],
          ["Análisis", ((resultado.metricas.total_ms ?? resultado.metricas.tiempo_ms) / 1000).toFixed(1) + " s"],
        ].map(([nombre, valor]) => (
          <div key={nombre} className="display">
            <dt>{nombre}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>

      <section className="estudio-card">
        <div className="estudio-card-title">
          <ListMusic size={17} aria-hidden="true" />
          <h2>Setlist por parecido</h2>
          <span className="estudio-sub">Melodía · DTW con las 12 transposiciones</span>
        </div>
        <ol className="setlist">
          {resultado.ranking.map((r, i) => (
            <li key={r.track_id} className={i === 0 && mejor ? "is-ganadora" : ""}>
              <span className="setlist-pos">{i + 1}</span>
              <span className="setlist-cancion">
                <strong>{r.titulo}</strong>
                <small>
                  {r.artista} · {tono(r.transposicion_semitonos)}
                </small>
              </span>
              <span className="medidor" style={{ "--valor": `${r.porcentaje_similitud}%` }}>
                {r.porcentaje_similitud}%
              </span>
              {r.audio_url && (
                <a
                  className="estudio-btn is-mini"
                  href={`${r.audio_url}#t=${r.original_inicio_s},${r.original_fin_s}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir la original en el tramo que coincidió"
                >
                  <Headphones size={13} aria-hidden="true" /> {tiempo(r.original_inicio_s)}
                </a>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
