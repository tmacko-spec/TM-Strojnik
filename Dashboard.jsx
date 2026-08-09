
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MachineCard from './MachineCard'
import { useApp } from './AppContext'
import { isVehicle, machineStatus } from './helpers'

export default function Dashboard() {
  const { state } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const activeShift = state.shifts.find(s => s.status === 'active')
  const activeMachine = activeShift && state.machines.find(m => m.id === activeShift.machineId)

  const rows = useMemo(() => {
    return state.machines.filter(machine => {
      const status = machineStatus(machine, state)
      const text = `${machine.brand} ${machine.model} ${machine.type} ${machine.serial}`.toLowerCase()
      const matchesQuery = text.includes(query.toLowerCase())
      const matchesFilter =
        filter === 'all' ||
        (filter === 'machines' && !isVehicle(machine)) ||
        (filter === 'vehicles' && isVehicle(machine)) ||
        (filter === 'attention' && status.level !== 'ok')
      return matchesQuery && matchesFilter
    })
  }, [state, query, filter])

  const machines = rows.filter(m => !isVehicle(m))
  const vehicles = rows.filter(isVehicle)

  const alerts = state.machines.filter(m => machineStatus(m, state).level !== 'ok').length
  const openFaults = state.faults.filter(f => !f.closed).length
  const activeCount = state.shifts.filter(s => s.status === 'active').length
  const dueTerms = state.inspections.filter(item => {
    if (item.done || !item.date) return false
    const today = new Date(); today.setHours(0,0,0,0)
    const due = new Date(`${item.date}T12:00:00`)
    return Math.ceil((due - today) / 86400000) <= 30
  }).length

  return (
    <>
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow">TM-STROJNÍK 4.0</span>
          <h2>Řízení techniky na jednom místě</h2>
          <p>Směny, servis, tankování, závady a přehled nákladů.</p>
        </div>
        <Link className="hero-primary" to="/machines/new">＋ Přidat techniku</Link>
      </section>

      {activeShift && (
        <Link className="active-shift-pro" to="/shifts">
          <div className="active-pulse" />
          <div>
            <small>PRÁVĚ PROBÍHÁ SMĚNA</small>
            <h3>{activeMachine?.brand} {activeMachine?.model}</h3>
            <p>{activeShift.operator} · {activeShift.customer || activeShift.job || 'Bez zakázky'}</p>
          </div>
          <span>Otevřít →</span>
        </Link>
      )}

      <section className="overview-grid">
        <article>
          <span>🚜</span>
          <div><small>Celkem techniky</small><b>{state.machines.length}</b></div>
        </article>
        <article>
          <span>▶️</span>
          <div><small>Aktivní směny</small><b>{activeCount}</b></div>
        </article>
        <article className={alerts ? 'warn' : ''}>
          <span>⚠️</span>
          <div><small>Vyžaduje pozornost</small><b>{alerts}</b></div>
        </article>
        <article className={openFaults ? 'bad' : ''}>
          <span>🔧</span>
          <div><small>Otevřené závady</small><b>{openFaults}</b></div>
        </article>
        <article className={dueTerms ? 'warn' : ''}>
          <span>📅</span>
          <div><small>Termíny do 30 dnů</small><b>{dueTerms}</b></div>
        </article>
      </section>

      <section className="quick-tools">
        <Link to="/ocr/meter"><span>📷</span><div><b>Načíst MTH / km</b><small>Z fotografie displeje</small></div></Link>
        <Link to="/ocr/receipt"><span>🧾</span><div><b>Načíst účtenku</b><small>Tankování pomocí OCR</small></div></Link>
        <Link to="/shifts"><span>🕒</span><div><b>Historie směn</b><small>Přehled práce obsluh</small></div></Link>
        <Link to="/planner"><span>📅</span><div><b>Servisy a termíny</b><small>STK, revize, pojištění</small></div></Link>
        <Link to="/survey"><span>📐</span><div><b>Vytyčení</b><small>Hřiště, pravé úhly a body</small></div></Link>
          <Link to="/settings"><span>💾</span><div><b>Záloha a nastavení</b><small>Data a číselníky</small></div></Link>
      </section>

      <section className="fleet-toolbar">
        <div className="fleet-title">
          <div><span className="eyebrow">VOZOVÝ PARK</span><h2>Moje technika</h2></div>
          <small>{rows.length} položek</small>
        </div>

        <input
          className="fleet-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Hledat podle názvu, typu nebo VIN…"
        />

        <div className="filter-tabs">
          {[
            ['all', 'Vše'],
            ['machines', 'Stroje'],
            ['vehicles', 'Automobily'],
            ['attention', 'Pozornost']
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {machines.length > 0 && (
        <section className="section">
          <div className="section-title pro"><h2>🚜 Stavební stroje</h2><span>{machines.length}</span></div>
          <div className="machine-grid">
            {machines.map(m => <MachineCard key={m.id} machine={m} />)}
          </div>
        </section>
      )}

      {vehicles.length > 0 && (
        <section className="section">
          <div className="section-title pro"><h2>🚐 Automobily</h2><span>{vehicles.length}</span></div>
          <div className="machine-grid">
            {vehicles.map(m => <MachineCard key={m.id} machine={m} />)}
          </div>
        </section>
      )}

      {!rows.length && (
        <div className="empty professional">
          <span>🔎</span>
          <h3>Nic jsme nenašli</h3>
          <p>Zkus upravit hledání nebo filtr.</p>
        </div>
      )}
    </>
  )
}
