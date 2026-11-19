import React from "react";
import { ChevronDown, Library, Settings2, SlidersHorizontal } from "lucide-react";

function Perilla({ label, ayuda, value, onChange, min, max, step = 1, sufijo = "" }) {
  return (
    <label className="perilla" title={ayuda}>
      <span>
        {label}
        <output>
          {value}
          {sufijo}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--pct": `${((value - min) / (max - min)) * 100}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <small className="campo-ayuda">{ayuda}</small>
    </label>
  );
}

export default function ParametrosCopyright({ params, cambiar, colecciones, n, setN, cargando, busy }) {
  return (
    <div className="consola">
      <div className="estudio-card-title">
        <SlidersHorizontal size={17} aria-hidden="true" />
        <h2>Consola de búsqueda</h2>
      </div>
      <fieldset disabled={busy} className="consola-campos">
        <label className="campo is-wide" title="Buscar solo en una fuente compara menos canciones y responde antes">
          <span>
            <Library size={13} aria-hidden="true" /> Biblioteca
          </span>
          <select value={n} onChange={(e) => setN(e.target.value)} required>
            {!colecciones.length && <option value="">{cargando ? "Cargando biblioteca…" : "Sin biblioteca disponible"}</option>}
            {colecciones.map((c) => (
              <option key={c.n} value={c.n}>
                {c.nombre || c.tabla}
                {c.canciones ? ` · ${c.canciones.toLocaleString()} canciones` : ""}
              </option>
            ))}
          </select>
          <small className="campo-ayuda">Buscar solo en una fuente compara menos canciones y responde antes.</small>
        </label>
        <label className="campo">
          <span>Bloque de análisis</span>
          <select value={params.segmento_s} onChange={(e) => cambiar("segmento_s", Number(e.target.value))}>
            <option value={5}>5 segundos</option>
            <option value={10}>10 segundos</option>
          </select>
          <small className="campo-ayuda">Cada cuántos segundos de tu audio se compara.</small>
        </label>
        <label className="campo" title="Exacta compara contra todo (más precisa). HNSW e IVF son aproximadas y más rápidas">
          <span>Método de búsqueda</span>
          <select value={params.metodo} onChange={(e) => cambiar("metodo", e.target.value)}>
            <option value="EXACTO">Exacta</option>
            <option value="HNSW">HNSW</option>
            <option value="IVF">IVF</option>
          </select>
          <small className="campo-ayuda">Exacta es más precisa; HNSW e IVF son más rápidas.</small>
        </label>
        <Perilla
          label="Vecinos (k)"
          ayuda="Cuántos segmentos parecidos se traen de la biblioteca por cada ventana de tu audio"
          min={1}
          max={200}
          value={params.k}
          onChange={(v) => cambiar("k", v)}
        />
        <Perilla
          label="Similitud BoAW mínima"
          ayuda="Parecido mínimo del histograma BoAW para que un segmento sea candidato"
          min={0}
          max={100}
          sufijo="%"
          value={Math.round(params.umbral * 100)}
          onChange={(v) => cambiar("umbral", v / 100)}
        />
      </fieldset>
      <fieldset disabled={busy} className="consola-avanzado-wrap">
        <details className="consola-avanzado">
          <summary>
            <Settings2 size={15} aria-hidden="true" /> Ajustes avanzados
            <ChevronDown size={16} className="consola-chevron" aria-hidden="true" />
          </summary>
          <div className="consola-campos">
            <Perilla
              label="Salto entre ventanas"
              ayuda="Cada cuántos segundos se toma una ventana. Menos salto = más preciso y más lento"
              min={0.1}
              max={1}
              step={0.1}
              sufijo=" s"
              value={params.paso_s}
              onChange={(v) => cambiar("paso_s", v)}
            />
            <Perilla
              label="Votos temporales mínimos"
              ayuda="Ventanas consecutivas que deben coincidir con la misma zona de la canción original"
              min={2}
              max={20}
              value={params.min_votos}
              onChange={(v) => cambiar("min_votos", v)}
            />
            <Perilla
              label="Similitud de secuencia mínima"
              ayuda="Parecido mínimo de la secuencia MFCC al verificar cada coincidencia"
              min={0}
              max={100}
              sufijo="%"
              value={Math.round(params.umbral_secuencia * 100)}
              onChange={(v) => cambiar("umbral_secuencia", v / 100)}
            />
            <label className="campo-check">
              <input type="checkbox" checked={params.reducir_ruido} onChange={(e) => cambiar("reducir_ruido", e.target.checked)} />
              <span>
                Compensar ruido de fondo
                <small className="campo-ayuda">Limpia el ruido antes de comparar.</small>
              </span>
            </label>
          </div>
        </details>
      </fieldset>
    </div>
  );
}
