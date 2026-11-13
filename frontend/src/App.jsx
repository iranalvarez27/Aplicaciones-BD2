import { useEffect, useState } from 'react';
import { Activity, Database, Moon, Music, ShoppingBag, Sun } from 'lucide-react';
import AudioCopyrightPanel from './components/AudioCopyrightPanel';
import ECommercePanel from './components/ECommercePanel';

const temaInicial = () => {
  try {
    const guardado = localStorage.getItem('bd2_theme');
    if (guardado === 'light' || guardado === 'dark') return guardado;
  } catch {  }
  return 'light';
};

export default function App() {
  const [tab, setTab] = useState('ecommerce');
  const [montadas, setMontadas] = useState({ ecommerce: true });
  const [theme, setTheme] = useState(temaInicial);
  const [motor, setMotor] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('bd2_theme', theme); } catch {  }
  }, [theme]);

  useEffect(() => {
    const comprobar = () => fetch('/api/health').then(r => r.json()).then(d => setMotor(d.engine === 'ok')).catch(() => setMotor(false));
    comprobar();
    const id = setInterval(comprobar, 15000);
    return () => clearInterval(id);
  }, []);

  const abrir = nombre => { setTab(nombre); setMontadas(m => ({ ...m, [nombre]: true })); };

  const copiarSQL = sql => navigator.clipboard?.writeText(sql).catch(() => {});

  return (
    <div className="app-shell flex flex-col h-screen w-screen text-slate-800 dark:text-slate-100 overflow-hidden font-sans">
      <header className="app-header shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="app-brand-mark">
            <Database className="w-4 h-4 text-white" />
            <span className="app-brand-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">APLICACIONES BD2</h1>
              <span className="app-version">BD2 · multimodal</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">Consumen el API REST del Minigestor Multimodal</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button onClick={() => abrir('ecommerce')} className={`workspace-tab tone-blue ${tab === 'ecommerce' ? 'is-active' : ''}`}><ShoppingBag className="w-3.5 h-3.5" /> E-commerce</button>
          <button onClick={() => abrir('audio')} className={`workspace-tab tone-blue ${tab === 'audio' ? 'is-active' : ''}`}><Music className="w-3.5 h-3.5" /> Copyright audio</button>
          <button
            onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="app-icon-button"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <div className={`app-status-pill ${motor ? 'is-online' : 'is-offline'}`}>
            {motor ? (
              <>
                <Activity className="w-3.5 h-3.5" />
                <span>Motor activo</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-600 dark:text-rose-400">{motor === null ? 'Comprobando motor…' : 'Motor Desconectado'}</span>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-hidden">
        {montadas.ecommerce && <div className={tab === 'ecommerce' ? 'h-full' : 'hidden'}><ECommercePanel onUseSQL={copiarSQL} /></div>}
        {montadas.audio && <div className={tab === 'audio' ? 'h-full' : 'hidden'}><AudioCopyrightPanel /></div>}
      </main>
    </div>
  );
}
