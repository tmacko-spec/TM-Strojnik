
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useState } from 'react'
import { useApp } from './AppContext'
import { formatDate, formatTime, isVehicle, machineStatus } from './helpers'

export default function MachineDetail() {
  const { id } = useParams()
  const { state } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
  const m = state.machines.find(x => x.id === id)

  if (!m) return <div className="empty">Technika nebyla nalezena.</div>

  const vehicle = isVehicle(m)
  const status = machineStatus(m, state)
  const shifts = state.shifts.filter(x => x.machineId === id)
  const fuel = state.fuel.filter(x => x.machineId === id)
  const service = state.service.filter(x => x.machineId === id)
  const faults = state.faults.filter(x => x.machineId === id)
  const activeShift = shifts.find(x => x.status === 'active')
  const openFaults = faults.filter(x => !x.closed)

  const totalFuel = fuel.reduce((s, x) => s + Number(x.total || 0), 0)
  const totalService = service.reduce((s, x) => s + Number(x.cost || 0), 0)
  const totalWorked = shifts
    .filter(x => x.status === 'closed')
    .reduce((s, x) => s + Math.max(0, Number(x.endHours || 0) - Number(x.startHours || 0)), 0)

  const lastFuel = [...fuel].sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]
  const lastService = [...service].sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]

  const remaining = useMemo(() => {
    const interval = Number(m.serviceInterval || 0)
    const last = Number(m.lastServiceHours || 0)
    const current = Number(m.hours || 0)
    return interval ? last + interval - current : null
  }, [m])

  const timeline = [
    ...shifts.map(x => ({
      date: x.endedAt || x.startedAt,
      icon: x.status === 'active' ? '▶️' : '⏹️',
      title: x.status === 'active' ? 'Směna probíhá' : 'Ukončená směna',
      text: `${x.operator} · ${x.customer || x.job || 'Bez zakázky'} · ${formatTime(x.startTime || x.startedAt)}–${formatTime(x.endTime || x.endedAt)}`
    })),
    ...fuel.map(x => ({
      date: x.date, icon: '⛽', title: 'Tankování',
      text: `${x.liters || 0} l · ${Number(x.total || 0).toLocaleString('cs-CZ')} Kč · ${x.station || ''}`
    })),
    ...service.map(x => ({
      date: x.date, icon: '🔧', title: x.title || 'Servis',
      text: `${Number(x.cost || 0).toLocaleString('cs-CZ')} Kč · ${x.hours || '—'} ${vehicle ? 'km' : 'MTH'}`
    })),
    ...faults.map(x => ({
      date: x.date, icon: '⚠️',
      title: x.closed ? 'Uzavřená závada' : 'Otevřená závada',
      text: x.description
    }))
  ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

  return (
    <>
      <section className={`detail-hero-pro ${status.level}`}>
        <div className="detail-visual">
          <div className="detail-machine-icon">{vehicle ? '🚐' : '🚜'}</div>
          <span>{vehicle ? 'AUTOMOBIL' : 'STAVEBNÍ STROJ'}</span>
        </div>
        <div className="detail-copy">
          <div className="detail-title-line">
            <div>
              <small>{m.type || (vehicle ? 'Automobil' : 'Stavební stroj')}</small>
              <h2>{m.brand} {m.model}</h2>
            </div>
            <span className={`detail-status-pill ${status.level}`}>{status.label}</span>
          </div>
          <div className="detail-meter">
            <small>{vehicle ? 'Aktuální kilometry' : 'Aktuální motohodiny'}</small>
            <strong>{m.hours || '—'} {vehicle ? 'km' : 'MTH'}</strong>
          </div>
          <div className="detail-identifiers">
            <span>Rok: <b>{m.year || '—'}</b></span>
            <span>{vehicle ? 'VIN / SPZ' : 'Výrobní číslo'}: <b>{m.serial || '—'}</b></span>
          </div>
        </div>
      </section>

      {activeShift && (
        <Link to="/shifts" className="machine-active-shift">
          <span>▶</span>
          <div><small>Směna probíhá</small><b>{activeShift.operator} · {activeShift.customer || activeShift.job || ''}</b></div>
          <strong>Otevřít →</strong>
        </Link>
      )}

      <section className="detail-kpis">
        <article>
          <small>Do servisu</small>
          <b className={remaining !== null && remaining < 0 ? 'text-bad' : ''}>
            {remaining === null ? 'Nenastaveno' : remaining < 0 ? `${Math.abs(remaining)} po termínu` : `${remaining} ${vehicle ? 'km' : 'MTH'}`}
          </b>
        </article>
        <article><small>Poslední tankování</small><b>{lastFuel ? formatDate(lastFuel.date) : '—'}</b></article>
        <article><small>Poslední servis</small><b>{lastService ? formatDate(lastService.date) : '—'}</b></article>
        <article><small>Otevřené závady</small><b className={openFaults.length ? 'text-bad' : ''}>{openFaults.length}</b></article>
      </section>

      <div className="detail-actions pro-actions">
        <button onClick={() => navigate(`/shift/start/${m.id}`)}>▶ Začít směnu</button>
        <Link to={`/machine/${m.id}/fuel`}>⛽ Tankování</Link>
        <Link to={`/machine/${m.id}/service`}>🔧 Servis</Link>
        <Link to={`/machine/${m.id}/fault`}>⚠️ Závada</Link>
        <Link to={`/machine/${m.id}/logbook`}>📘 Provozní deník</Link>
      </div>

      <nav className="detail-tabs">
        {[
          ['overview','Přehled'],
          ['timeline','Časová osa'],
          ['costs','Náklady'],
          ['documents','Dokumenty']
        ].map(([value,label]) => (
          <button key={value} className={tab===value?'active':''} onClick={()=>setTab(value)}>{label}</button>
        ))}
      </nav>

      {tab === 'overview' && (
        <>
          <section className="stats-grid detail-stats">
            <div><small>PHM celkem</small><b>{totalFuel.toLocaleString('cs-CZ')} Kč</b></div>
            <div><small>Servis celkem</small><b>{totalService.toLocaleString('cs-CZ')} Kč</b></div>
            <div><small>Odpracováno</small><b>{totalWorked.toFixed(1)} {vehicle ? 'km' : 'MTH'}</b></div>
            <div><small>Směny</small><b>{shifts.length}</b></div>
          </section>

          <section className="card machine-info-card">
            <div className="section-title"><h3>Základní informace</h3><Link to={`/machines/${m.id}/edit`}>Upravit</Link></div>
            <dl>
              <div><dt>Kategorie</dt><dd>{vehicle ? 'Automobil' : 'Stavební stroj'}</dd></div>
              <div><dt>Typ</dt><dd>{m.type || '—'}</dd></div>
              <div><dt>Servisní interval</dt><dd>{m.serviceInterval || '—'} {vehicle ? 'km' : 'MTH'}</dd></div>
              <div><dt>Poslední servis při</dt><dd>{m.lastServiceHours || '—'} {vehicle ? 'km' : 'MTH'}</dd></div>
            </dl>
            {m.note && <p className="machine-note">{m.note}</p>}
          </section>

          <section className="card qr-card modern">
            <div><span className="eyebrow">DIGITÁLNÍ IDENTITA</span><h3>QR kód techniky</h3><p>Naskenováním se otevře přímo tato karta.</p></div>
            <QRCodeSVG value={`${location.origin}/machine/${m.id}`} size={128} />
          </section>
        </>
      )}

      {tab === 'timeline' && (
        <div className="timeline professional">
          {timeline.length ? timeline.map((e, i) => (
            <article key={`${e.date}-${i}`}>
              <div className="timeline-icon">{e.icon}</div>
              <div><small>{formatDate(e.date)}</small><h4>{e.title}</h4><p>{e.text}</p></div>
            </article>
          )) : <div className="empty">Zatím nejsou žádné události.</div>}
        </div>
      )}

      {tab === 'costs' && (
        <section className="costs-panel">
          <div className="cost-total">
            <small>Celkové evidované náklady</small>
            <strong>{(totalFuel + totalService).toLocaleString('cs-CZ')} Kč</strong>
          </div>
          <div className="cost-breakdown">
            <article><span>⛽</span><div><small>Palivo</small><b>{totalFuel.toLocaleString('cs-CZ')} Kč</b></div></article>
            <article><span>🔧</span><div><small>Servis</small><b>{totalService.toLocaleString('cs-CZ')} Kč</b></div></article>
            <article><span>📊</span><div><small>Náklad na jednotku</small><b>{totalWorked > 0 ? Math.round((totalFuel+totalService)/totalWorked).toLocaleString('cs-CZ') : '—'} Kč</b></div></article>
          </div>
        </section>
      )}

      {tab === 'documents' && (
        <section className="documents-grid">
          {[
            ['📄','Technický průkaz'],
            ['🛡️','Pojištění'],
            ['📅','STK / revize'],
            ['📘','Návody a dokumentace'],
            ['🧰','Filtry a kapaliny'],
            ['📷','Fotografie stroje']
          ].map(([icon,label]) => <button key={label}><span>{icon}</span><b>{label}</b><small>Připravujeme</small></button>)}
        </section>
      )}
    </>
  )
}
