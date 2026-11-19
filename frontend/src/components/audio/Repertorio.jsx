import React, { useMemo, useState } from "react";
import { Captions, ChevronLeft, ChevronRight, LoaderCircle, Mic, Pause, Play, Search, Wand2 } from "lucide-react";
import Portada from "./Portada";
import { tiempo } from "./formato";

export const POR_PAGINA = 10;

function Preparacion({ estado, onPreparar, iniciando }) {
  const prep = estado?.preparacion;
  if (prep?.activa) {
    const pct = prep.total ? Math.round((100 * prep.hechas) / prep.total) : 0;
    return (
      <div className="preparando" role="status" aria-live="polite">
        <LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true" />
        <div>
          <strong>
            Preparando el repertorio… {prep.hechas}/{prep.total}
          </strong>
          <span>{prep.actual ? `Última: ${prep.actual}` : "Extrayendo la melodía de cada canción (~30 s cada una)"}</span>
          <div className="preparando-barra">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="repertorio-vacio">
      <p className="estudio-vacio">
        Aún no hay canciones preparadas en este servidor
        {estado?.directorio ? (
          <>
            {" "}
            (<code title={estado.directorio}>{estado.directorio}</code>)
          </>
        ) : null}
        .
      </p>
      {estado?.audios_disponibles === false ? (
        <p className="estudio-nota">
          El servidor no tiene los audios originales. Copia <code>bench/data/musica_propia</code> o ejecuta{" "}
          <code>python -m deteccion.acapella preparar</code> donde estén.
        </p>
      ) : (
        <button type="button" className="estudio-btn is-primario" onClick={onPreparar} disabled={iniciando}>
          {iniciando ? <LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true" /> : <Wand2 size={16} aria-hidden="true" />}
          Preparar repertorio ({estado?.por_defecto ?? 24} canciones)
        </button>
      )}
      {!!prep?.omitidas?.length && (
        <p className="estudio-nota">{prep.omitidas.length} canciones no se pudieron preparar (falta su audio).</p>
      )}
      {prep?.error && <p className="estudio-nota">Último error: {prep.error}</p>}
    </div>
  );
}

function Letras({ letras, lista, onPreparar, iniciando, hayCanciones }) {
  const prep = letras?.preparacion;
  if (!letras) return null;
  if (prep?.activa) {
    const pct = prep.total ? Math.round((100 * prep.hechas) / prep.total) : 0;
    return (
      <div className="preparando" role="status" aria-live="polite">
        <LoaderCircle size={16} className="motion-safe:animate-spin" aria-hidden="true" />
        <div>
          <strong>
            Transcribiendo letras… {prep.hechas}/{prep.total}
          </strong>
          <span>{prep.actual ? `Última: ${prep.actual}` : "Whisper escucha la voz de cada canción (~1 min cada una)"}</span>
          <div className="preparando-barra">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="letras-estado">
      <p className="estudio-nota">
        <Captions size={13} aria-hidden="true" />{" "}
        {lista ? `Letras listas: ${letras.canciones_con_letra} canciones.` : "Las letras aún no están preparadas: sin ellas solo se compara la melodía."}
      </p>
      {hayCanciones && (
        <button type="button" className="estudio-btn" onClick={onPreparar} disabled={iniciando}>
          {iniciando ? <LoaderCircle size={15} className="motion-safe:animate-spin" aria-hidden="true" /> : <Wand2 size={15} aria-hidden="true" />}
          {lista ? "Actualizar letras" : "Preparar letras"}
        </button>
      )}
      {prep?.error && <p className="estudio-nota">Último error: {prep.error}</p>}
    </div>
  );
}

export default function Repertorio({ canciones, estado, onPreparar, iniciando, error, letras, letrasListas, onPrepararLetras, iniciandoLetras, seleccionada, sonandoId, onElegir, onAlternar }) {
  const [filtro, setFiltro] = useState("");
  const [artista, setArtista] = useState("");
  const [pagina, setPagina] = useState(1);

  const artistas = useMemo(() => {
    const cuenta = new Map();
    for (const c of canciones) cuenta.set(c.artista, (cuenta.get(c.artista) || 0) + 1);
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nombre]) => nombre);
  }, [canciones]);

  const visibles = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    return canciones.filter((c) => (!artista || c.artista === artista) && (!f || `${c.titulo} ${c.artista}`.toLowerCase().includes(f)));
  }, [canciones, filtro, artista]);

  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const actual = Math.min(pagina, paginas);
  const desde = (actual - 1) * POR_PAGINA;
  const fila = visibles.slice(desde, desde + POR_PAGINA);
  const numeros = useMemo(() => {
    const ini = Math.max(1, Math.min(actual - 2, paginas - 4));
    return Array.from({ length: Math.min(5, paginas) }, (_, i) => ini + i);
  }, [actual, paginas]);
  const preparando = estado?.preparacion?.activa;

  return (
    <div className="repertorio">
      {error && <p className="estudio-aviso">{error}</p>}
      {preparando && canciones.length > 0 && <Preparacion estado={estado} />}
      {canciones.length ? (
        <>
          <label className="repertorio-buscar">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              placeholder="Buscar canción o artista"
              value={filtro}
              onChange={(e) => {
                setFiltro(e.target.value);
                setPagina(1);
              }}
              aria-label="Buscar en el repertorio"
            />
          </label>
          {artistas.length > 1 && (
            <div className="repertorio-chips" role="group" aria-label="Filtrar por artista">
              {["", ...artistas].map((nombre) => (
                <button key={nombre || "todas"} type="button" className={artista === nombre ? "is-activo" : ""} aria-pressed={artista === nombre} onClick={() => {
                    setArtista(nombre);
                    setPagina(1);
                  }}>
                  {nombre || "Todas"}
                </button>
              ))}
            </div>
          )}
          {visibles.length > 0 && (
            <div className="repertorio-cabecera" aria-hidden="true">
              <span>#</span>
              <span>Título</span>
              <span>Duración</span>
              <span />
            </div>
          )}
          <ul className="repertorio-lista">
            {fila.map((c, i) => {
              const elegida = seleccionada === c.track_id;
              const sonando = sonandoId === c.track_id;
              return (
                <li key={c.track_id} className={(elegida ? "is-elegida" : "") + (sonando ? " is-sonando" : "")}>
                  <div className="cancion-fila">
                    <button type="button" className="cancion-num" onClick={() => onAlternar?.(c)} aria-pressed={sonando} aria-label={`${sonando ? "Pausar" : "Escuchar"} ${c.titulo}`} title={sonando ? "Pausar" : "Escuchar"}>
                      <span className="num">{sonando ? "♪" : elegida ? "●" : desde + i + 1}</span>
                      {sonando ? <Pause size={14} className="play" aria-hidden="true" /> : <Play size={14} className="play" aria-hidden="true" />}
                    </button>
                    <button type="button" className="cancion-main" onClick={() => onElegir?.(c)} aria-pressed={elegida} title="Ver la letra y cantarla">
                      <span className="cancion-datos">
                        <Portada titulo={c.titulo} artista={c.artista} />
                        <span className="cancion-texto">
                          <strong>{c.titulo}</strong>
                          <small>{c.artista}</small>
                        </span>
                      </span>
                      <span className="cancion-dur mono">{c.duracion_s ? tiempo(c.duracion_s) : "—"}</span>
                      <Mic size={15} className="cancion-mic" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {!visibles.length && <p className="estudio-vacio">Ninguna canción coincide con «{filtro}».</p>}
          {visibles.length > POR_PAGINA && (
            <nav className="paginado" aria-label="Páginas del repertorio">
              <span className="estudio-nota">
                {desde + 1}–{Math.min(desde + POR_PAGINA, visibles.length)} de {visibles.length}
              </span>
              <div>
                <button type="button" onClick={() => setPagina(actual - 1)} disabled={actual === 1} aria-label="Página anterior">
                  <ChevronLeft size={16} />
                </button>
                {numeros.map((n) => (
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
      ) : (
        !error && <Preparacion estado={estado} onPreparar={onPreparar} iniciando={iniciando} />
      )}
      <Letras letras={letras} lista={letrasListas} onPreparar={onPrepararLetras} iniciando={iniciandoLetras} hayCanciones={canciones.length > 0} />
    </div>
  );
}
