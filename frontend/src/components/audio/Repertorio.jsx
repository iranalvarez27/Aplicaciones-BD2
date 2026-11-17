import React, { useMemo, useState } from "react";
import { Captions, Disc3, LoaderCircle, Search, Wand2 } from "lucide-react";

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

export default function Repertorio({ canciones, estado, onPreparar, iniciando, error, letras, letrasListas, onPrepararLetras, iniciandoLetras }) {
  const [filtro, setFiltro] = useState("");
  const grupos = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    const mapa = new Map();
    for (const c of canciones) {
      if (f && !`${c.titulo} ${c.artista}`.toLowerCase().includes(f)) continue;
      if (!mapa.has(c.artista)) mapa.set(c.artista, []);
      mapa.get(c.artista).push(c);
    }
    return [...mapa.entries()];
  }, [canciones, filtro]);
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
              onChange={(e) => setFiltro(e.target.value)}
              aria-label="Buscar en el repertorio"
            />
          </label>
          <div className="repertorio-lista">
            {grupos.map(([artista, lista]) => (
              <section key={artista}>
                <h3>{artista}</h3>
                <ul>
                  {lista.map((c) => (
                    <li key={c.track_id}>
                      <Disc3 size={13} aria-hidden="true" /> {c.titulo}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {!grupos.length && <p className="estudio-vacio">Ninguna canción coincide con «{filtro}».</p>}
          </div>
        </>
      ) : (
        !error && <Preparacion estado={estado} onPreparar={onPreparar} iniciando={iniciando} />
      )}
      <Letras letras={letras} lista={letrasListas} onPreparar={onPrepararLetras} iniciando={iniciandoLetras} hayCanciones={canciones.length > 0} />
    </div>
  );
}
