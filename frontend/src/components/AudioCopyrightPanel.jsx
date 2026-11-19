import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Compass, Disc3, History, LoaderCircle, Mic, MicVocal, RefreshCw, Search, SlidersHorizontal, Upload, X } from "lucide-react";
import {
  detectarCopyright,
  estadoLetras,
  estadoRepertorio,
  leerProgreso,
  listarBibliotecas,
  listarRepertorio,
  prepararLetras,
  prepararRepertorio,
  subirAudio,
} from "./audio/api";
import { claveFragmento, coloresPorPista, EXTENSIONES, LIMITES, TAMANO_MAX, tiempo } from "./audio/formato";
import { borrarAnalisis, guardarAnalisis, leerHistorial, vaciarHistorial } from "./audio/registroAnalisis";
import Historial from "./audio/Historial";
import { picosDeAudio } from "./audio/onda";
import FuenteAudio from "./audio/FuenteAudio";
import LogoEstudio from "./audio/LogoEstudio";
import Grabadora from "./audio/Grabadora";
import Explorar from "./audio/Explorar";
import Karaoke from "./audio/Karaoke";
import PanelResultados from "./audio/PanelResultados";
import ParametrosCopyright from "./audio/ParametrosCopyright";
import Repertorio from "./audio/Repertorio";
import { useGrabacion } from "./audio/useGrabacion";
import "./audio/audio.css";

const PARAMETROS_INICIALES = {
  segmento_s: 5,
  paso_s: 0.5,
  k: 100,
  umbral: 0.65,
  min_votos: 2,
  metodo: "EXACTO",
  representacion: "hibrida",
  umbral_secuencia: 0.6,
  reducir_ruido: true,
};

const BARRAS_BANNER = Array.from({ length: 46 }, (_, i) => ({ alto: 24 + ((i * 37) % 58), retardo: (i * 0.13) % 1.9 }));

const FUENTES = [
  { clave: "subir", icono: Upload, texto: "Subir archivo" },
  { clave: "grabar", icono: Mic, texto: "Grabar" },
];

const mensaje = (r) => (r.status === "rejected" && r.reason?.name !== "AbortError" ? r.reason.message : "");

export default function AudioCopyrightPanel() {
  const [fuente, setFuente] = useState("subir");
  const [colecciones, setColecciones] = useState([]);
  const [repertorio, setRepertorio] = useState([]);
  const [estadoRep, setEstadoRep] = useState(null);
  const [letras, setLetras] = useState(null);
  const [iniciandoLetras, setIniciandoLetras] = useState(false);
  const [avisos, setAvisos] = useState({ bibliotecas: "", repertorio: "" });
  const [cargando, setCargando] = useState(true);
  const [iniciandoPrep, setIniciandoPrep] = useState(false);
  const [n, setN] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [duracion, setDuracion] = useState(null);
  const [subida, setSubida] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [, setEstado] = useState("");
  const [transcurrido, setTranscurrido] = useState(0);
  const [params, setParams] = useState(PARAMETROS_INICIALES);
  const [reproduciendo, setReproduciendo] = useState(null);
  const panel = useRef(null);
  const [ventana, setVentana] = useState(null);
  const [onda, setOnda] = useState(null);
  const [fase, setFase] = useState("");
  const [progreso, setProgreso] = useState({});
  const progresoId = useRef("");
  const [tiempoS, setTiempoS] = useState(0);
  const [historial, setHistorial] = useState(leerHistorial);
  const [desdeHistorial, setDesdeHistorial] = useState("");
  const [cancion, setCancion] = useState(null);
  const [karaokeAbierto, setKaraokeAbierto] = useState(true);
  const [vista, setVista] = useState("explorar");
  const [ordenPlay, setOrdenPlay] = useState(0);
  const [sonandoId, setSonandoId] = useState(null);
  const [ordenPausa, setOrdenPausa] = useState(0);
  const ondaToken = useRef(0);
  const cabecera = useRef(null);
  const fragmento = useRef(null);
  const player = useRef(null);
  const alToma = useRef(() => {});
  const grabacion = useGrabacion({ onToma: (toma) => alToma.current(toma), onError: (m) => setError(m) });
  const grabando = grabacion.grabando;

  const cargar = useCallback((signal) => {
    return Promise.allSettled([
      listarBibliotecas(signal).then((data) => {
        setColecciones(data.colecciones);
        setN(
          (prev) =>
            String(
              data.colecciones.find((c) => String(c.n) === prev)?.n ||
                data.colecciones.find((c) => c.completa)?.n ||
                data.colecciones[0]?.n ||
                "",
            ),
        );
      }),
      listarRepertorio(signal).then((data) => setRepertorio(data.canciones || [])),
      estadoRepertorio(signal).then(setEstadoRep),
      estadoLetras(signal).then(setLetras),
    ]).then(([bibliotecas, canciones, estadoServidor]) => {
      if (signal?.aborted) return;
      setAvisos({ bibliotecas: mensaje(bibliotecas), repertorio: mensaje(canciones) || mensaje(estadoServidor) });
      setCargando(false);
    });
  }, []);

  useEffect(() => {
    const c = new AbortController();
    cargar(c.signal);
    return () => c.abort();
  }, [cargar]);

  const preparandoRep = !!estadoRep?.preparacion?.activa;
  const preparandoLetras = !!letras?.preparacion?.activa;
  useEffect(() => {
    if (!preparandoRep && !preparandoLetras) return;
    const c = new AbortController();
    const timer = setInterval(() => {
      Promise.all([estadoRepertorio(c.signal), listarRepertorio(c.signal), estadoLetras(c.signal)])
        .then(([e, data, l]) => {
          setEstadoRep(e);
          setRepertorio(data.canciones || []);
          setLetras(l);
        })
        .catch(() => {});
    }, 2000);
    return () => {
      clearInterval(timer);
      c.abort();
    };
  }, [preparandoRep, preparandoLetras]);

  useEffect(() => {
    if (!ventana) return;
    const alTeclear = (e) => e.key === "Escape" && setVentana(null);
    const alPulsar = (e) => cabecera.current && !cabecera.current.contains(e.target) && setVentana(null);
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("mousedown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("mousedown", alPulsar);
    };
  }, [ventana]);
  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);
  useEffect(() => {
    if (!busy) return;
    const inicio = Date.now();
    const timer = setInterval(() => setTranscurrido(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (fase !== "analizando") return;
    const c = new AbortController();
    const timer = setInterval(() => {
      leerProgreso(progresoId.current, c.signal)
        .then(setProgreso)
        .catch(() => {});
    }, 700);
    return () => {
      clearInterval(timer);
      c.abort();
    };
  }, [fase]);

  const limpiarResultado = () => {
    player.current?.pause();
    fragmento.current = null;
    setReproduciendo(null);
    setResultado(null);
    setEstado("");
    setDesdeHistorial("");
  };

  const seleccionar = (archivo) => {
    setVista("analizar");
    limpiarResultado();
    setSubida(null);
    setDuracion(null);
    setError("");
    setPreview("");
    setOnda(null);
    setTiempoS(0);
    if (archivo && !EXTENSIONES.test(archivo.name)) {
      setFile(null);
      setError("Selecciona un audio MP3, WAV, OGG, FLAC o M4A.");
      return;
    }
    if (archivo && archivo.size > TAMANO_MAX) {
      setFile(null);
      setError("El archivo debe pesar como máximo 50 MB.");
      return;
    }
    setFile(archivo);
    if (archivo) {
      setPreview(URL.createObjectURL(archivo));
      const token = ++ondaToken.current;
      picosDeAudio(archivo).then((o) => token === ondaToken.current && setOnda(o));
    }
  };
  useEffect(() => {
    alToma.current = seleccionar;
  });

  const cambiarFuente = (nueva) => {
    if (busy || grabando || nueva === fuente) return;
    setFuente(nueva);
    seleccionar(null);
  };

  const prepararLetrasServidor = async () => {
    setIniciandoLetras(true);
    setError("");
    try {
      setLetras(await prepararLetras());
    } catch (err) {
      setError(err.message);
    } finally {
      setIniciandoLetras(false);
    }
  };

  const preparar = async () => {
    setIniciandoPrep(true);
    setError("");
    try {
      setEstadoRep(await prepararRepertorio());
    } catch (err) {
      setError(err.message);
    } finally {
      setIniciandoPrep(false);
    }
  };

  const analizar = async (e) => {
    e.preventDefault();
    if (!file || busy || grabando || !n) return;
    const [minimo, maximo] = LIMITES.copyright;
    if (duracion !== null && (duracion < minimo || duracion > maximo)) {
      setError(`Tu audio debe durar entre ${tiempo(minimo)} y ${tiempo(maximo)}.`);
      return;
    }
    setTranscurrido(0);
    setBusy(true);
    setVista("resultado");
    setError("");
    limpiarResultado();
    try {
      setFase("subiendo");
      setEstado(subida ? "Preparando el análisis…" : "Subiendo el audio…");
      const archivo = subida || (await subirAudio(file));
      setSubida(archivo);
      progresoId.current = globalThis.crypto?.randomUUID?.() || `a${Date.now()}${Math.floor(Math.random() * 1e6)}`;
      setProgreso({});
      setFase("analizando");
      setEstado("Buscando la grabación y la letra cantada…");
      const nuevo = await detectarCopyright(archivo.path, n, params, progresoId.current);
      setResultado(nuevo);
      const mejor = nuevo.coincidencias.reduce((a, b) => (!a || b.porcentaje_similitud > a.porcentaje_similitud ? b : a), null);
      const delRepertorio = mejor && repertorio.find((c) => c.track_id === mejor.track_id);
      if (delRepertorio) {
        setCancion(delRepertorio);
        setKaraokeAbierto(true);
      }
      setHistorial(guardarAnalisis(file.name, nuevo));
      setEstado("Análisis completado");
    } catch (err) {
      setError(err.message);
      setEstado("");
      setVista("analizar");
    } finally {
      setBusy(false);
      setFase("");
    }
  };

  const buscarEn = (segundo) => {
    const audio = player.current;
    if (!audio) return;
    audio.currentTime = segundo;
    audio.play().catch(() => {});
  };
  const abrirDelHistorial = (item) => {
    seleccionar(null);
    setVista("resultado");
    setResultado(item.resultado);
    setDesdeHistorial(item.fecha);
    setVentana(null);
    panel.current?.scrollTo?.({ top: panel.current.scrollHeight, behavior: "smooth" });
  };

  const sincronizar = (audio) => {
    for (const otro of panel.current.querySelectorAll("audio")) if (otro !== audio) otro.pause();
    setReproduciendo(audio === player.current ? fragmento.current : null);
  };
  const escuchar = (coincidencia) => {
    const audio = player.current;
    if (!audio) return;
    const clave = claveFragmento(coincidencia);
    if (fragmento.current === clave && !audio.paused) {
      audio.pause();
      return;
    }
    if (fragmento.current !== clave || audio.ended) {
      fragmento.current = clave;
      audio.currentTime = coincidencia.inicio_s;
    }
    audio.play().catch((err) => {
      if (err.name !== "AbortError") setError("Pulsa reproducir en el control de audio.");
    });
  };
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(resultado, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "analisis-copyright.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const nuevoAnalisis = () => {
    seleccionar(null);
    panel.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  };
  const cantar = () => {
    setVista("analizar");
    cambiarFuente("grabar");
    panel.current?.querySelector(".is-cabina")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  const alternarCancion = (c) => {
    if (cancion?.track_id === c.track_id && sonandoId === c.track_id) {
      setOrdenPausa((n) => n + 1);
      return;
    }
    setCancion(c);
    setKaraokeAbierto(true);
    setOrdenPlay((n) => n + 1);
  };
  const verLetraDe = (trackId) => {
    const encontrada = repertorio.find((c) => c.track_id === trackId);
    if (!encontrada) return;
    setCancion(encontrada);
    setKaraokeAbierto(true);
    panel.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  };
  const recargar = () => {
    setCargando(true);
    cargar();
  };

  useEffect(() => {
    panel.current?.scrollTo?.({ top: 0 });
  }, [vista]);

  const bloqueado = busy || grabando;
  const puedeAnalizar = !!file && !cargando && !bloqueado && !!n;
  const motivo = !file ? (fuente === "grabar" ? "Graba una toma" : "Sube un audio") : !n ? "No hay biblioteca disponible" : "";
  const letrasListas = !!letras?.tabla_lista;
  const panelDerecho = karaokeAbierto && !(vista !== "analizar" && !cancion);
  const repertorioIds = useMemo(() => new Set(repertorio.map((c) => c.track_id)), [repertorio]);
  const opciones = ventana === "opciones";
  const tramos = useMemo(() => {
    if (!resultado || desdeHistorial) return [];
    const colores = coloresPorPista(resultado.coincidencias);
    return resultado.coincidencias.map((c) => ({ inicio_s: c.inicio_s, fin_s: c.fin_s, titulo: c.titulo, color: colores.get(c.track_id) }));
  }, [resultado, desdeHistorial]);

  return (
    <div ref={panel} className="estudio" aria-label="Detección de copyright">
      <header ref={cabecera} className={"estudio-header" + (grabando ? " is-live" : "")}>
        <span className="banner-ondas" aria-hidden="true">
          {BARRAS_BANNER.map((b, i) => (
            <i key={i} style={{ "--alto": `${b.alto}%`, "--retardo": `${b.retardo}s` }} />
          ))}
        </span>
        <div className="estudio-marca">
          <span className="estudio-logo" aria-hidden="true">
            <LogoEstudio />
          </span>
          <div>
            <span className="estudio-eyebrow">
              <i aria-hidden="true" /> {grabando ? "Grabando en cabina" : "Copyright · Karaoke"}
            </span>
            <strong>Detección de copyright</strong>
            <span>Encuentra la grabación original o una canción del repertorio cantada por ti</span>
          </div>
        </div>
        <div className="estudio-acciones">
          <button
            type="button"
            className={"estudio-btn" + (opciones ? " is-activo" : "")}
            onClick={() => setVentana(opciones ? null : "opciones")}
            aria-expanded={opciones}
            aria-controls="opciones-avanzadas"
            title="Opciones avanzadas"
          >
            <SlidersHorizontal size={15} aria-hidden="true" /> Opciones avanzadas
          </button>
          <button
            type="button"
            className={"estudio-btn" + (ventana === "historial" ? " is-activo" : "")}
            onClick={() => setVentana(ventana === "historial" ? null : "historial")}
            aria-expanded={ventana === "historial"}
            aria-controls="historial-analisis"
            title="Historial de análisis"
          >
            <History size={15} aria-hidden="true" /> Historial
            {historial.length > 0 && <span className="estudio-chip">{historial.length}</span>}
          </button>
          <button type="button" className="estudio-btn" onClick={recargar} disabled={bloqueado || cargando} title="Volver a leer bibliotecas y repertorio">
            <RefreshCw size={15} className={cargando ? "motion-safe:animate-spin" : ""} aria-hidden="true" /> Actualizar
          </button>
        </div>
        {opciones && (
          <div id="opciones-avanzadas" className="opciones-flotante" role="dialog" aria-label="Opciones avanzadas del detector">
            <button type="button" className="opciones-cerrar" aria-label="Cerrar opciones" onClick={() => setVentana(null)}>
              <X size={16} />
            </button>
            {avisos.bibliotecas && <p className="estudio-aviso">{avisos.bibliotecas}</p>}
            <ParametrosCopyright
              params={params}
              cambiar={(clave, valor) => setParams((p) => ({ ...p, [clave]: valor }))}
              colecciones={colecciones}
              n={n}
              setN={(v) => {
                setN(v);
                setResultado(null);
              }}
              cargando={cargando}
              busy={busy}
            />
          </div>
        )}
        {ventana === "historial" && (
          <div id="historial-analisis" className="opciones-flotante" role="dialog" aria-label="Historial de análisis">
            <button type="button" className="opciones-cerrar" aria-label="Cerrar historial" onClick={() => setVentana(null)}>
              <X size={16} />
            </button>
            <Historial
              items={historial}
              onAbrir={abrirDelHistorial}
              onBorrar={(id) => setHistorial(borrarAnalisis(id))}
              onVaciar={() => setHistorial(vaciarHistorial())}
            />
          </div>
        )}
      </header>

      {error && (
        <div className="estudio-error" role="alert">
          {error}
          <button type="button" aria-label="Cerrar error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      <div className="vistas" role="tablist" aria-label="Pantallas">
        <button type="button" role="tab" aria-selected={vista === "explorar"} className={vista === "explorar" ? "is-activa" : ""} onClick={() => setVista("explorar")}>
          <Compass size={15} aria-hidden="true" /> Explorar
        </button>
        <button type="button" role="tab" aria-selected={vista === "analizar"} className={vista === "analizar" ? "is-activa" : ""} onClick={() => setVista("analizar")}>
          <Search size={15} aria-hidden="true" /> Analizar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={vista === "resultado"}
          className={vista === "resultado" ? "is-activa" : ""}
          onClick={() => setVista("resultado")}
          disabled={!resultado && !busy}
          title={!resultado && !busy ? "Aparece cuando analices un audio" : undefined}
        >
          {busy ? <LoaderCircle size={15} className="motion-safe:animate-spin" aria-hidden="true" /> : <Disc3 size={15} aria-hidden="true" />} Resultado
          {busy ? " · analizando…" : resultado ? <span className="estudio-chip">{resultado.coincidencias.length}</span> : null}
        </button>
        <button
          type="button"
          className={"vistas-karaoke" + (karaokeAbierto ? " is-activa" : "")}
          onClick={() => setKaraokeAbierto((v) => !v)}
          aria-pressed={karaokeAbierto}
          title={karaokeAbierto ? "Ocultar el panel de letra" : "Mostrar el panel de letra"}
        >
          <MicVocal size={15} aria-hidden="true" /> Letra
        </button>
      </div>

      <div className={"estudio-layout" + (panelDerecho ? "" : " sin-karaoke")}>
        <div className={"estudio-col" + (vista !== "explorar" ? " is-oculta" : "")}>
          <Explorar
            canciones={repertorio}
            seleccionada={cancion?.track_id}
            sonandoId={sonandoId}
            onAlternar={alternarCancion}
          />
        </div>
        <div className={"estudio-col" + (vista !== "analizar" ? " is-oculta" : "")}>
        <form onSubmit={analizar} className="estudio-una">
          <section className="estudio-card is-cabina" aria-label="Tu audio">
            <div className="cabina-titulo">
              <h2>Tu audio</h2>
              <p>Sube una canción o canta directo con el micrófono.</p>
            </div>
            <div className="fuente-selector" role="group" aria-label="Cómo cargar el audio">
              {FUENTES.map(({ clave, icono: IconoFuente, texto }) => (
                <button
                  key={clave}
                  type="button"
                  className={fuente === clave ? "is-active" : ""}
                  aria-pressed={fuente === clave}
                  onClick={() => cambiarFuente(clave)}
                  disabled={bloqueado}
                >
                  <IconoFuente size={16} aria-hidden="true" /> {texto}
                </button>
              ))}
            </div>
            {fuente === "grabar" && <Grabadora grabacion={grabacion} deshabilitada={busy} />}
            <FuenteAudio
              sinZona={fuente === "grabar"}
              onda={onda}
              tramos={tramos}
              posicion={tiempoS}
              onBuscar={buscarEn}
              onTiempo={setTiempoS}
              file={file}
              preview={preview}
              duracion={duracion}
              limites={LIMITES.copyright}
              bloqueada={bloqueado}
              onSeleccionar={seleccionar}
              onEliminar={() => seleccionar(null)}
              playerRef={player}
              onPlay={sincronizar}
              onStop={() => setReproduciendo(null)}
              onDuracion={setDuracion}
            />
            <div className="cabina-acciones">
              <p className="estudio-nota">
                {fuente === "grabar" ? "La grabación se detiene sola a los 2 min" : "5 s a 10 min · máximo 50 MB"}
              </p>
            <button type="submit" className="estudio-btn is-primario" disabled={!puedeAnalizar} title={motivo}>
              {busy ? <LoaderCircle size={17} className="motion-safe:animate-spin" aria-hidden="true" /> : <Search size={17} aria-hidden="true" />}
              {busy ? "Analizando…" : "Analizar"}
            </button>
            {!busy && motivo && <p className="estudio-nota">{motivo}</p>}
            </div>
          </section>

        </form>

        <div className="repertorio-celda">
          <section className="estudio-card repertorio-plegable" aria-label="Canciones que se pueden cantar">
            <div className="estudio-card-title">
              <Disc3 size={16} aria-hidden="true" /> Canciones que se pueden cantar
              <span className="estudio-chip">{repertorio.length}</span>
            </div>
            <Repertorio
              canciones={repertorio}
              estado={estadoRep}
              onPreparar={preparar}
              iniciando={iniciandoPrep}
              error={avisos.repertorio}
              letras={letras}
              letrasListas={letrasListas}
              onPrepararLetras={prepararLetrasServidor}
              iniciandoLetras={iniciandoLetras}
              seleccionada={cancion?.track_id}
              sonandoId={sonandoId}
              onAlternar={alternarCancion}
              onElegir={(c) => {
                setCancion(c);
                setKaraokeAbierto(true);
              }}
            />
          </section>
        </div>
        </div>
        <div className={"estudio-col" + (vista !== "resultado" ? " is-oculta" : "")}>
      <PanelResultados
        busy={busy}
        fase={fase}
        progreso={progreso}
        transcurrido={transcurrido}
        resultado={resultado}
        desdeHistorial={desdeHistorial}
        reproduciendo={reproduciendo}
        tiempoS={tiempoS}
        onBuscar={file ? buscarEn : undefined}
        onEscuchar={escuchar}
        onSincronizar={sincronizar}
        onNuevo={nuevoAnalisis}
        onExportar={descargar}
        repertorioIds={repertorioIds}
        onVerLetra={verLetraDe}
      />
        </div>
        <div className={panelDerecho ? "karaoke-celda" : "is-oculta"}>
          <Karaoke cancion={cancion} grabando={grabando} onCantar={cantar} onCerrar={() => setKaraokeAbierto(false)} orden={ordenPlay} ordenPausa={ordenPausa} onSonando={setSonandoId} />
        </div>
      </div>
    </div>
  );
}
