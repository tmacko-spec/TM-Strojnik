import { NavLink, Outlet } from 'react-router-dom'
import logo from './logo.png'

export default function Layout() {
  return (
    <>
      <div className="app-shell">
        <header className="topbar professional">
          <img src={logo} alt="Tomáš Macko" className="main-logo" />
          <div className="topbar-version">v4.0</div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav professional">
        <NavLink to="/"><span>⌂</span><small>Domů</small></NavLink>
        <NavLink to="/machines/new"><span>＋</span><small>Přidat</small></NavLink>
        <NavLink to="/shifts"><span>◷</span><small>Směny</small></NavLink>
        <NavLink to="/planner"><span>📅</span><small>Termíny</small></NavLink>
        <NavLink to="/settings"><span>⚙️</span><small>Nastavení</small></NavLink>
      </nav>
    </>
  )
}
