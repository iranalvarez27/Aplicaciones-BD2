import React, { useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Mic, MicVocal, Pause, Play, Search } from "lucide-react";
import Portada from "./Portada";
import { tiempo } from "./formato";

const ARTISTAS_POR_PAGINA = 12;
const CANCIONES_POR_PAGINA = 12;
const FILAS_ARTISTA = 10;

const COLORES_RADIO = ["#7ee8b0", "#ff9d78", "#c7a4ff", "#ffd36e", "#7cc4ff", "#ff9ccc", "#9be26f", "#ff8585"];
const hash = (texto) => [...texto].reduce((h, ch) => (h * 31 + ch.codePointAt(0)) >>> 0, 7);

const duracionTotal = (segundos) => {
  const m = Math.round(segundos / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function Paginado({ pagina, paginas, desde, hasta, total, onPagina, etiqueta }) {
  if (paginas <= 1) return null;
  const ini = Math.max(1, Math.min(pagina - 2, paginas - 4));
  const numeros = Array.from({ length: Math.min(5, paginas) }, (_, i) => ini + i);
  return (
    <nav className="paginado" aria-label={etiqueta}>
      <span className="estudio-nota">
        {desde + 1}–{hasta} de {total}
      </span>
      <div>
        <button type="button" onClick={() => onPagina(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior">
          <ChevronLeft size={16} />
        </button>
        {numeros.map((n) => (
          <button key={n} type="button" className={n === pagina ? "is-activo" : ""} aria-current={n === pagina ? "page" : undefined} onClick={() => onPagina(n)}>
            {n}
          </button>
        ))}
        <button type="button" onClick={() => onPagina(pagina + 1)} disabled={pagina === paginas} aria-label="Página siguiente">
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

function Carril({ titulo, onTodos, children }) {
  const pista = useRef(null);
  const mover = (dir) => pista.current?.scrollBy({ left: dir * pista.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <section className="carril-seccion" aria-label={titulo}>
      <div className="carril-cabeza">
        <h3>{titulo}</h3>
        {onTodos && (
          <button type="button" onClick={onTodos}>
            Mostrar todos
          </button>
        )}
      </div>
      <div className="carril-wrap">
        <button type="button" className="carril-flecha is-izq" onClick={() => mover(-1)} aria-label={`${titulo}: anteriores`}>
          <ChevronLeft size={20} />
        </button>
        <div className="carril" ref={pista}>
          {children}
        </div>
        <button type="button" className="carril-flecha is-der" onClick={() => mover(1)} aria-label={`${titulo}: siguientes`}>
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  );
}

function TarjetaArtista({ a, onAbrir }) {
  return (
    <button type="button" className="artista-card" onClick={() => onAbrir(a.nombre)}>
      <span className="artista-portada">
        <Portada titulo={a.lista[0].titulo} artista={a.nombre} className="tarjeta" />
        <span className="artista-play-hover" aria-hidden="true">
          <Play size={20} fill="currentColor" />
        </span>
      </span>
      <strong>{a.nombre}</strong>
      <small>{plural(a.lista.length, "canción", "canciones")}</small>
    </button>
  );
}

function TarjetaCancion({ c, sonando, onAlternar }) {
  return (
    <button type="button" className={"artista-card" + (sonando ? " is-sonando" : "")} onClick={() => onAlternar(c)} title={sonando ? "Pausar" : "Escuchar y ver la letra"} aria-pressed={sonando}>
      <span className="artista-portada">
        <Portada titulo={c.titulo} artista={c.artista} className="tarjeta" />
        <span className="artista-play-hover" aria-hidden="true">
          {sonando ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </span>
      </span>
      <strong>{c.titulo}</strong>
      <small>{c.artista}</small>
    </button>
  );
}

function TarjetaRadio({ a, vecinos, onAbrir }) {
  const color = COLORES_RADIO[hash(a.nombre) % COLORES_RADIO.length];
  const con = a.lista
    .slice(0, 2)
    .map((c) => c.titulo.split(/[-(]/)[0].trim())
    .join(", ");
  return (
    <div className="radio-card">
      <button type="button" className="radio-arte" style={{ background: color }} onClick={() => onAbrir(a.nombre)} aria-label={`Abrir ${a.nombre}`}>
        <span className="radio-marca">
          <MicVocal size={13} aria-hidden="true" /> ARTISTA
        </span>
        <span className="radio-fotos" aria-hidden="true">
          {vecinos[0] && <Portada titulo={vecinos[0].lista[0].titulo} artista={vecinos[0].nombre} className="circulo lado" />}
          <Portada titulo={a.lista[0].titulo} artista={a.nombre} className="circulo centro" />
          {vecinos[1] && <Portada titulo={vecinos[1].lista[0].titulo} artista={vecinos[1].nombre} className="circulo lado" />}
        </span>
        <span className="radio-nombre">{a.nombre}</span>
      </button>
      <p className="radio-sub">Con {con} y más</p>
    </div>
  );
}

function FilaCancion({ c, indice, seleccionada, sonandoId, onAlternar }) {
  const elegida = seleccionada === c.track_id;
  const sonando = sonandoId === c.track_id;
  return (
    <li className={(elegida ? "is-elegida" : "") + (sonando ? " is-sonando" : "")}>
      <button type="button" className="cancion-fila" onClick={() => onAlternar(c)} aria-pressed={sonando} title={sonando ? "Pausar" : "Escuchar y ver la letra"}>
        <span className="cancion-num">
          <span className="num">{sonando ? "♪" : indice}</span>
          {sonando ? <Pause size={14} className="play" aria-hidden="true" /> : <Play size={14} className="play" aria-hidden="true" />}
        </span>
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
    </li>
  );
}

export default function Explorar({ canciones, seleccionada, sonandoId, onAlternar }) {
  const [modo, setModo] = useState("todo");
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [artista, setArtista] = useState(null);
  const [paginaC, setPaginaC] = useState(1);

  const artistas = useMemo(() => {
    const mapa = new Map();
    for (const c of canciones) {
      if (!mapa.has(c.artista)) mapa.set(c.artista, []);
      mapa.get(c.artista).push(c);
    }
    return [...mapa.entries()]
      .map(([nombre, lista]) => ({
        nombre,
        lista: lista.sort((a, b) => a.titulo.localeCompare(b.titulo)),
        segundos: lista.reduce((suma, c) => suma + (c.duracion_s || 0), 0),
      }))
      .sort((a, b) => b.lista.length - a.lista.length || a.nombre.localeCompare(b.nombre));
  }, [canciones]);

  const mezcladas = useMemo(() => [...canciones].sort((a, b) => hash(a.track_id) - hash(b.track_id)), [canciones]);

  const abrir = (nombre) => {
    setArtista(nombre);
    setPaginaC(1);
  };
  const cambiarModo = (nuevo) => {
    setModo(nuevo);
    setFiltro("");
    setPagina(1);
  };

  if (!canciones.length) {
    return (
      <section className="estudio-card explorar" aria-label="Explorar música">
        <div className="cabina-titulo">
          <h2>Explorar</h2>
          <p>Aún no hay canciones preparadas. Prepara el repertorio desde la pestaña Analizar para escucharlas aquí.</p>
        </div>
      </section>
    );
  }

  const actual = artista ? artistas.find((a) => a.nombre === artista) : null;

  if (actual) {
    const paginas = Math.max(1, Math.ceil(actual.lista.length / FILAS_ARTISTA));
    const pag = Math.min(paginaC, paginas);
    const desde = (pag - 1) * FILAS_ARTISTA;
    return (
      <section className="estudio-card explorar" aria-label={`Canciones de ${actual.nombre}`}>
        <button type="button" className="explorar-volver" onClick={() => setArtista(null)}>
          <ArrowLeft size={16} aria-hidden="true" /> Volver
        </button>
        <header className="artista-cabecera">
          <Portada titulo={actual.lista[0].titulo} artista={actual.nombre} className="hero" />
          <div>
            <span className="disco-sello">Artista</span>
            <h2>{actual.nombre}</h2>
            <p>
              {plural(actual.lista.length, "canción", "canciones")}
              {actual.segundos ? ` · ${duracionTotal(actual.segundos)}` : ""}
            </p>
          </div>
        </header>
        <div className="artista-acciones">
          <button type="button" className="artista-play" onClick={() => onAlternar(actual.lista.find((c) => c.track_id === sonandoId) || actual.lista[0])}
            aria-label={actual.lista.some((c) => c.track_id === sonandoId) ? `Pausar a ${actual.nombre}` : `Reproducir a ${actual.nombre}`}>
            {actual.lista.some((c) => c.track_id === sonandoId) ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
          </button>
        </div>
        <div className="repertorio-cabecera" aria-hidden="true">
          <span>#</span>
          <span>Título</span>
          <span>Duración</span>
          <span />
        </div>
        <ul className="repertorio-lista">
          {actual.lista.slice(desde, desde + FILAS_ARTISTA).map((c, i) => (
            <FilaCancion key={c.track_id} c={c} indice={desde + i + 1} seleccionada={seleccionada} sonandoId={sonandoId} onAlternar={onAlternar} />
          ))}
        </ul>
        <Paginado pagina={pag} paginas={paginas} desde={desde} hasta={Math.min(desde + FILAS_ARTISTA, actual.lista.length)} total={actual.lista.length} onPagina={setPaginaC} etiqueta="Páginas de canciones" />
      </section>
    );
  }

  const chips = (
    <div className="repertorio-chips" role="group" aria-label="Qué mostrar">
      {[
        ["todo", "Todo"],
        ["artistas", "Artistas"],
        ["canciones", "Canciones"],
      ].map(([clave, texto]) => (
        <button key={clave} type="button" className={modo === clave ? "is-activo" : ""} aria-pressed={modo === clave} onClick={() => cambiarModo(clave)}>
          {texto}
        </button>
      ))}
    </div>
  );

  if (modo !== "todo") {
    const f = filtro.trim().toLowerCase();
    const esArtistas = modo === "artistas";
    const lista = esArtistas
      ? artistas.filter((a) => !f || a.nombre.toLowerCase().includes(f))
      : mezcladas.filter((c) => !f || `${c.titulo} ${c.artista}`.toLowerCase().includes(f));
    const porPagina = esArtistas ? ARTISTAS_POR_PAGINA : CANCIONES_POR_PAGINA;
    const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
    const pag = Math.min(pagina, paginas);
    const desde = (pag - 1) * porPagina;
    return (
      <section className="estudio-card explorar" aria-label="Explorar música">
        {chips}
        <div className="explorar-cabeza">
          <div className="cabina-titulo">
            <h2>{esArtistas ? "Artistas" : "Canciones para cantar"}</h2>
            <p>{esArtistas ? "Elige un artista para ver y escuchar sus canciones." : "Pulsa una canción para escucharla con su letra."}</p>
          </div>
          <label className="repertorio-buscar">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              placeholder={esArtistas ? "Buscar artista" : "Buscar canción o artista"}
              value={filtro}
              onChange={(e) => {
                setFiltro(e.target.value);
                setPagina(1);
              }}
              aria-label="Buscar"
            />
          </label>
        </div>
        {!lista.length && <p className="estudio-vacio">Nada coincide con «{filtro}».</p>}
        <ul className="artistas-grid">
          {lista.slice(desde, desde + porPagina).map((x) => (
            <li key={esArtistas ? x.nombre : x.track_id}>{esArtistas ? <TarjetaArtista a={x} onAbrir={abrir} /> : <TarjetaCancion c={x} sonando={sonandoId === x.track_id} onAlternar={onAlternar} />}</li>
          ))}
        </ul>
        <Paginado pagina={pag} paginas={paginas} desde={desde} hasta={Math.min(desde + porPagina, lista.length)} total={lista.length} onPagina={setPagina} etiqueta="Páginas" />
      </section>
    );
  }

  const rapidos = artistas.slice(0, 8);
  const radio = artistas.slice(0, 12);
  const descubre = artistas.slice(12);
  return (
    <section className="estudio-card explorar" aria-label="Explorar música">
      {chips}

      <div className="rapido-grid">
        {rapidos.map((a) => (
          <button key={a.nombre} type="button" className="rapido-card" onClick={() => abrir(a.nombre)}>
            <Portada titulo={a.lista[0].titulo} artista={a.nombre} />
            <strong>{a.nombre}</strong>
            <span className="rapido-play" aria-hidden="true">
              <Play size={16} fill="currentColor" />
            </span>
          </button>
        ))}
      </div>

      <Carril titulo="Artistas populares" onTodos={() => cambiarModo("artistas")}>
        {radio.map((a, i) => (
          <TarjetaRadio key={a.nombre} a={a} vecinos={[radio[i - 1], radio[i + 1]]} onAbrir={abrir} />
        ))}
      </Carril>

      <Carril titulo="Canciones para cantar" onTodos={() => cambiarModo("canciones")}>
        {mezcladas.slice(0, 14).map((c) => (
          <TarjetaCancion key={c.track_id} c={c} sonando={sonandoId === c.track_id} onAlternar={onAlternar} />
        ))}
      </Carril>

      {descubre.length > 0 && (
        <Carril titulo="Más para descubrir" onTodos={() => cambiarModo("artistas")}>
          {descubre.slice(0, 14).map((a) => (
            <TarjetaArtista key={a.nombre} a={a} onAbrir={abrir} />
          ))}
        </Carril>
      )}
    </section>
  );
}
