import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router'
import { CheckCircle2, Menu, Moon, Sun, X } from 'lucide-react'
import { setTheme, useTheme } from '../lib/theme'
import { useVisited } from '../lib/hooks'
import { LESSONS, lessonNumber, lessonsByModule } from '../lessons'
import { MODULES } from '../lessons/modules'

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <rect width="64" height="64" rx="14" fill="var(--bg-inset)" />
      <path d="M17 20 26 27M47 20 38 27M17 44 26 37M47 44 38 37" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="10" fill="var(--g-blue)" />
      <circle cx="14" cy="18" r="5" fill="var(--g-red)" />
      <circle cx="50" cy="18" r="5" fill="var(--g-yellow)" />
      <circle cx="14" cy="46" r="5" fill="var(--g-green)" />
      <circle cx="50" cy="46" r="5" fill="var(--c-model)" />
    </svg>
  )
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const visited = useVisited()
  return (
    <nav aria-label="Lecciones">
      {MODULES.map((m) => (
        <div key={m.id} className="nav-module" data-tone={m.tone}>
          <div className="nav-module-title">
            <span className="dot" />
            {m.n}. {m.title}
          </div>
          <ul>
            {lessonsByModule(m.id).map((l) => (
              <li key={l.slug}>
                <NavLink to={`/leccion/${l.slug}`} onClick={onNavigate} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                  <span className="num">{String(lessonNumber(l.slug)).padStart(2, '0')}</span>
                  <span style={{ flex: 1 }}>{l.short ?? l.title}</span>
                  {visited.includes(l.slug) && <CheckCircle2 size={13} className="check" style={{ alignSelf: 'center' }} />}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

export function Layout() {
  const theme = useTheme()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'
  const visited = useVisited()
  const done = LESSONS.filter((l) => visited.includes(l.slug)).length

  useEffect(() => setDrawer(false), [location.pathname])

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="icon-btn lg-hide" onClick={() => setDrawer(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <Link to="/" className="brand">
            <Logo />
            <span>
              Google Agents<span className="brand-dim"> Ecosystem</span>
            </span>
          </Link>
          <div className="spacer" />
          <div className="topbar-progress sm-hide" title="Lecciones visitadas">
            <span>
              {done}/{LESSONS.length} lecciones
            </span>
            <span className="meter">
              <span style={{ width: `${(done / Math.max(1, LESSONS.length)) * 100}%` }} />
            </span>
          </div>
          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className={`shell${isHome ? ' no-sidebar' : ''}`}>
        {!isHome && (
          <aside className="sidebar">
            <Sidebar />
          </aside>
        )}
        <main className="main">
          <Outlet />
        </main>
      </div>

      {drawer && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <div className="drawer-panel">
            <div className="drawer-head">
              <Link to="/" className="brand">
                <Logo /> <span>Google Agents Ecosystem</span>
              </Link>
              <button className="icon-btn" onClick={() => setDrawer(false)} aria-label="Cerrar menú">
                <X size={20} />
              </button>
            </div>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <footer className="footer">
        Google Agents Ecosystem · Tutorial interactivo para construir agentes en la plataforma de Google. Las pantallas de la consola, los
        terminales y las respuestas del modelo son <strong>simulaciones</strong> con fines didácticos; los nombres de productos, comandos,
        APIs y formatos corresponden a la documentación oficial verificada en noviembre de 2026. No es un sitio de Google.
      </footer>
      <ScrollRestoration />
    </div>
  )
}
