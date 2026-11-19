import React, { useMemo, useRef, useState } from "react";
import { AudioWaveform, Captions, ChevronLeft, ChevronRight, Disc3, ListMusic, MicVocal, Pause, Play, ShieldAlert, ShieldCheck, SlidersHorizontal } from "lucide-react";
import Portada from "./Portada";
import { claveFragmento, COLORES, etiquetaTipo, tiempo } from "./formato";

const POR_PAGINA = 5;
const BLOQUES_POR_PAGINA = 5;

function Etiqueta({ c }) {
  return <span className={"etiqueta-tipo" + (c.tipo === "cancion_cantada" ? " is-cantada" : "")}>{etiquetaTipo(c)}</span>;
}

function Anillo({ valor }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, valor));
  return (
    <svg className="anillo" viewBox="0 0 84 84" role="img" aria-label={`${valor}% de similitud`}>
      <circle cx="42" cy="42" r={r} className="anillo-fondo" />
      <circle cx="42" cy="42" r={r} className="anillo-valor" strokeDasharray={`${(c * v) / 100} ${c}`} />
      <text x="42" y="47" textAnchor="middle">
        {Math.round(v)}%
      </text>
    </svg>
  );
}

function Original({ c, onSincronizar }) {
  const ref = useRef(null);
  const [suena, setSuena] = useState(false);
  if (!c.audio_url) return null;
  const alternar = () => {
    const a = ref.current;
    if (!a) return;
    if (!a.paused) {
      a.pause();
      return;
    }
    if (a.ended || a.currentTime >= c.original_fin_s) a.currentTime = c.original_inicio_s;
    a.play().catch(() => {});
  };
  return (
    <>
      <button type="button" className="pista-btn" onClick={alternar} aria-pressed={suena} aria-label={`${suena ? "Pausar" : "Escuchar"} la original de ${c.titulo}`}>
        {suena ? <Pause size={14} aria-hidden="true" /> : <Disc3 size={14} aria-hidden="true" />} Original
      </button>
      <audio
        ref={ref}
        preload="none"
        src={`${c.audio_url}#t=${c.original_inicio_s},${c.original_fin_s}`}
        onPlay={(e) => {
          setSuena(true);
          onSincronizar(e.currentTarget);
        }}
        onPause={() => setSuena(false)}
        onEnded={() => setSuena(false)}
      />
    </>
  );
}

const PESTANAS = [
  ["canciones", "Canciones", ListMusic],
  ["tiempo", "Línea de tiempo", AudioWaveform],
  ["letra", "Tu letra", Captions],
  ["detalles", "Detalles", SlidersHorizontal],
];

export default function ResultadoCopyright({ resultado, reproduciendo, onEscuchar, onSincronizar, tiempoS, onBuscar, repertorioIds, onVerLetra }) {
  const [pestana, setPestana] = useState("canciones");
  const [pagina, setPagina] = useState(1);
  const [paginaBloques, setPaginaBloques] = useState(1);

  const pistas = useMemo(() => {
    const mapa = new Map();
    for (const c of resultado.coincidencias) {
      if (!mapa.has(c.track_id)) mapa.set(c.track_id, []);
      mapa.get(c.track_id).push(c);
    }
    return mapa;
  }, [resultado]);
  const hay = resultado.coincidencias.length > 0;
  const mejor = hay ? resultado.coincidencias.reduce((a, b) => (b.porcentaje_similitud > a.porcentaje_similitud ? b : a)) : null;
  const total = ((resultado.metricas.total_ms ?? resultado.metricas.tiempo_ms) / 1000).toFixed(1);

  const paginas = Math.max(1, Math.ceil(resultado.coincidencias.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const desde = (actual - 1) * POR_PAGINA;
  const fila = resultado.coincidencias.slice(desde, desde + POR_PAGINA);

  return (
    <>
      <header className={"resultado-hero" + (hay ? "" : " is-limpio")}>
        {mejor ? (
          <Portada titulo={mejor.titulo} artista={mejor.artista} className="hero" />
        ) : (
          <span className="resultado-escudo" aria-hidden="true">
            <ShieldCheck size={64} />
          </span>
        )}
        <div className="resultado-hero-info">
          <span className="disco-sello">{hay ? "Posible contenido protegido" : "Sin coincidencias"}</span>
          <h2>{mejor ? mejor.titulo : "Tu audio está limpio"}</h2>
          <p className="resultado-sub">
            {mejor ? (
              <>
                <strong>{mejor.artista}</strong> · {pistas.size} {pistas.size === 1 ? "canción" : "canciones"} · {resultado.coincidencias.length}{" "}
                {resultado.coincidencias.length === 1 ? "tramo" : "tramos"} · {tiempo(resultado.duracion_s)}
              </>
            ) : (
              <>Duración {tiempo(resultado.duracion_s)} · analizado en {total} s</>
            )}
          </p>
          <p className="resultado-conclusion">
            {hay ? <ShieldAlert size={15} aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />} {resultado.conclusion}
          </p>
          {mejor && repertorioIds?.has(mejor.track_id) && (
            <button type="button" className="estudio-btn is-verde" onClick={() => onVerLetra?.(mejor.track_id)}>
              <MicVocal size={16} aria-hidden="true" /> Ver la letra y cantarla de nuevo
            </button>
          )}
        </div>
        {mejor && <Anillo valor={mejor.porcentaje_similitud} />}
      </header>

      <div className="pestanas" role="tablist" aria-label="Secciones del resultado">
        {PESTANAS.map(([clave, texto, Icono]) => (
          <button key={clave} type="button" role="tab" aria-selected={pestana === clave} className={pestana === clave ? "is-activa" : ""} onClick={() => setPestana(clave)}>
            <Icono size={15} aria-hidden="true" /> {texto}
            {clave === "canciones" && hay && <span className="estudio-chip">{resultado.coincidencias.length}</span>}
          </button>
        ))}
      </div>

      {pestana === "canciones" && (
        <section className="estudio-card" role="tabpanel" aria-label="Canciones coincidentes">
          {!hay && <p className="estudio-vacio">Ningún fragmento superó los criterios de confirmación.</p>}
          {hay && (
            <>
              <div className="tracklist-cabecera" aria-hidden="true">
                <span>#</span>
                <span>Canción</span>
                <span>En tu audio</span>
                <span>Similitud</span>
                <span />
              </div>
              <ul className="tracklist">
                {fila.map((c, i) => {
                  const sonando = reproduciendo === claveFragmento(c);
                  return (
                    <li key={claveFragmento(c)}>
                      <span className="tracklist-num">{desde + i + 1}</span>
                      <div className="tracklist-cancion">
                        <Portada titulo={c.titulo} artista={c.artista} />
                        <div>
                          <strong>{c.titulo}</strong>
                          <small>
                            {c.artista}
                            {c.fuente ? ` · ${c.fuente}` : ""}
                          </small>
                          <Etiqueta c={c} />
                        </div>
                      </div>
                      <span className="tracklist-tramo mono">
                        {tiempo(c.inicio_s)}–{tiempo(c.fin_s)}
                        <small>
                          original {tiempo(c.original_inicio_s)}–{tiempo(c.original_fin_s)}
                        </small>
                      </span>
                      <span className="medidor" style={{ "--valor": `${c.porcentaje_similitud}%` }}>
                        {c.porcentaje_similitud}%
                      </span>
                      <div className="tracklist-acciones">
                        <button type="button" className="pista-btn" onClick={() => onEscuchar(c)} aria-pressed={sonando} aria-label={sonando ? "Pausar tu audio" : "Reproducir tu audio"}>
                          {sonando ? <Pause size={14} aria-hidden="true" /> : <Play size={14} aria-hidden="true" />} Tu audio
                        </button>
                        <Original c={c} onSincronizar={onSincronizar} />
                        {repertorioIds?.has(c.track_id) && (
                          <button type="button" className="pista-btn is-verde" onClick={() => onVerLetra?.(c.track_id)}>
                            <MicVocal size={14} aria-hidden="true" /> Letra
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {paginas > 1 && (
                <nav className="paginado" aria-label="Páginas de coincidencias">
                  <span className="estudio-nota">
                    {desde + 1}–{Math.min(desde + POR_PAGINA, resultado.coincidencias.length)} de {resultado.coincidencias.length}
                  </span>
                  <div>
                    <button type="button" onClick={() => setPagina(actual - 1)} disabled={actual === 1} aria-label="Página anterior">
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: paginas }, (_, n) => n + 1).map((n) => (
                      <button key={n} type="button" className={n === actual ? "is-activo" : ""} aria-current={n === actual ? "page" : undefined} onClick={() => setPagina(n)}>
                        {n}
                      </button>
                    ))}
                    <button type="button" onClick={() => setPagina(actual + 1)} disabled={actual === paginas} aria-label="Página siguiente">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>
      )}

      {pestana === "tiempo" && (
        <section className="estudio-card" role="tabpanel" aria-label="Línea de tiempo">
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
                  <Portada titulo={eventos[0].titulo} artista={eventos[0].artista} className="mini" />
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
      )}

      {pestana === "letra" && (
        <section className="estudio-card is-letra" role="tabpanel" aria-label="Texto reconocido">
          <div className="estudio-card-title">
            <Captions size={17} aria-hidden="true" />
            <h2>Tu letra</h2>
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

      {pestana === "detalles" && (
        <section role="tabpanel" aria-label="Detalles del análisis">
          <dl className="displays">
            {[
              ["Canciones", pistas.size],
              ["Tramos", resultado.coincidencias.length],
              ["Duración", tiempo(resultado.duracion_s)],
              ["Análisis", total + " s"],
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
          <ul className="leyenda-tipos">
            <li>
              <span className="etiqueta-tipo">Misma grabación</span> tu audio contiene un trozo de la canción original.
            </li>
            <li>
              <span className="etiqueta-tipo is-cantada">Canción cantada</span> alguien canta una canción del repertorio (por letra o melodía).
            </li>
          </ul>
          {resultado.metricas?.letra_error && <p className="estudio-aviso">Canción cantada: {resultado.metricas.letra_error}.</p>}
          {!!resultado.segmentos?.length && (
            <section className="estudio-card candidatos" aria-label="Candidatos por histograma">
              <div className="estudio-card-title">
                <ListMusic size={17} aria-hidden="true" />
                <h2>Candidatos por histograma</h2>
                <span className="estudio-chip">{resultado.segmentos.length} bloques</span>
              </div>
              <p className="estudio-nota">
                La similitud BoAW preselecciona candidatos; la alineación temporal y la secuencia verifican cada coincidencia.
              </p>
              {(() => {
                const total = resultado.segmentos.length;
                const paginasB = Math.max(1, Math.ceil(total / BLOQUES_POR_PAGINA));
                const actualB = Math.min(paginaBloques, paginasB);
                const desdeB = (actualB - 1) * BLOQUES_POR_PAGINA;
                return (
                  <>
                    {resultado.segmentos.slice(desdeB, desdeB + BLOQUES_POR_PAGINA).map((segmento) => (
                      <div key={segmento.inicio_s} className="bloque">
                        <div className="bloque-cabeza">
                          <strong className="mono">
                            {tiempo(segmento.inicio_s)}–{tiempo(segmento.fin_s)}
                          </strong>
                          <span>
                            {segmento.coincidencias.length} {segmento.coincidencias.length === 1 ? "coincidencia" : "coincidencias"} con evidencia temporal
                          </span>
                        </div>
                        {segmento.candidatos.length ? (
                          <ol className="bloque-lista">
                            {segmento.candidatos.slice(0, 5).map((c, k) => {
                              const pct = c.porcentaje_similitud ?? Number((100 * c.similitud).toFixed(2));
                              return (
                                <li key={`${c.track_id}:${k}`}>
                                  <span className="tracklist-num">{k + 1}</span>
                                  <Portada titulo={c.titulo} artista={c.artista} className="mini" />
                                  <span className="bloque-titulo">
                                    <strong>{c.titulo}</strong>
                                    <small>{c.artista}</small>
                                  </span>
                                  <span className="bloque-barra" aria-hidden="true">
                                    <i style={{ width: `${Math.min(100, pct)}%` }} />
                                  </span>
                                  <span className="bloque-pct">BoAW {pct}%</span>
                                </li>
                              );
                            })}
                          </ol>
                        ) : (
                          <p className="estudio-vacio">Sin candidatos</p>
                        )}
                      </div>
                    ))}
                    {paginasB > 1 && (
                      <nav className="paginado" aria-label="Páginas de bloques">
                        <span className="estudio-nota">
                          Bloques {desdeB + 1}–{Math.min(desdeB + BLOQUES_POR_PAGINA, total)} de {total}
                        </span>
                        <div>
                          <button type="button" onClick={() => setPaginaBloques(actualB - 1)} disabled={actualB === 1} aria-label="Página anterior">
                            <ChevronLeft size={16} />
                          </button>
                          <span className="paginado-actual">
                            {actualB} / {paginasB}
                          </span>
                          <button type="button" onClick={() => setPaginaBloques(actualB + 1)} disabled={actualB === paginasB} aria-label="Página siguiente">
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </nav>
                    )}
                  </>
                );
              })()}
            </section>
          )}
        </section>
      )}
    </>
  );
}
