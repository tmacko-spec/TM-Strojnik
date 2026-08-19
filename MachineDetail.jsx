
import { Link, useNavigate, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { useMemo, useState } from 'react'
import { useApp } from './AppContext'
import { formatDate, formatTime, isVehicle, machineStatus } from './helpers'

export default function MachineDetail() {
  const { id } = useParams()
  const { state, update } = useApp()
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

  const closeFault = fault => {
    update(prev => ({
      ...prev,

      // Z otevřených závad ji úplně odstraníme
      faults: prev.faults.filter(f =>
        !(
          f.machineId === fault.machineId &&
          f.date === fault.date &&
          f.description === fault.description
        )
      ),

      // Záznam zůstane zachovaný v historii
      closedFaults: [
        {
          ...fault,
          closed: true,
          closedAt: new Date().toISOString()
        },
        ...(Array.isArray(prev.closedFaults) ? prev.closedFaults : [])
      ]
    }))
  }

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
      type: 'shift',
      record: x,
      text: `${x.operator} · ${x.customer || x.job || 'Bez zakázky'} · ${formatTime(x.startTime || x.startedAt)}–${formatTime(x.endTime || x.endedAt)}`
    })),
    ...fuel.map(x => ({
      date: x.date, icon: '⛽', title: 'Tankování',
      text: `${x.liters || 0} l · ${Number(x.total || 0).toLocaleString('cs-CZ')} Kč · ${x.station || ''}`
    })),
    ...service.map(x => ({
      date: x.date,
      icon: '🔧',
      title: x.title || 'Servis',
      type: 'service',
      service: x,
      text: `${Number(x.cost || 0).toLocaleString('cs-CZ')} Kč · ${x.hours || '-'} ${vehicle ? 'km' : 'MTH'}`
    })),
    ...faults.map(x => ({
      date: x.date, icon: '⚠️',
      title: x.closed ? 'Uzavřená závada' : 'Otevřená závada',
      text: x.description
    })),
      ...(Array.isArray(state.closedFaults) ? state.closedFaults : [])
        .filter(x => x.machineId === id)
        .map(x => ({
          date: x.closedAt || x.date,
          icon: '✅',
          title: 'Uzavřená závada',
          type: 'closedFault',
          record: x,
          text: x.description
        }))
  ].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

  return (
    <>
      <section className={`detail-hero-pro ${status.level}`}>
        <div className="detail-visual">
  {m.photo ? (
    <img src={m.photo} alt="" className="detail-machine-photo" />
  ) : (
    <>
      <div className="detail-machine-icon">{vehicle ? '🚙' : '🚜'}</div>
      <span>{vehicle ? 'AUTOMOBIL' : 'STAVEBNÍ STROJ'}</span>
    </>
  )}
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
        <Link to={`/machines/${m.id}/edit`}>✏️ Upravit</Link>
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
          {openFaults.length > 0 && (
          <section className="card" style={{ marginBottom: 18 }}>
            <h3>⚠️ Otevřené závady</h3>

            {openFaults.map(f => (
              <div
                key={f.id}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #ddd'
                }}
              >
                <p style={{ marginTop: 0 }}>
                  <b>{f.description}</b>
                </p>

                <small>{f.date || ''}</small>

                <button
                  type="button"
                  onClick={() => closeFault(f)}
                  style={{ marginTop: 10, display: 'block' }}
                >
                  ✅ Závada odstraněna
                </button>
              </div>
            ))}
          </section>
        )}

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
              <div>
                  <small>{formatDate(e.date)}</small>
                  <h4>{e.title}</h4>

                  {e.type === 'service' ? (
                    <details>
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                        {e.text} · zobrazit detail
                      </summary>

                      <div style={{ marginTop: 10 }}>
                        <p><b>Datum:</b> {formatDate(e.service.date)}</p>
                        <p><b>{vehicle ? 'km' : 'MTH'}:</b> {e.service.hours || '-'}</p>
                        <p><b>Cena:</b> {Number(e.service.cost || 0).toLocaleString('cs-CZ')} Kč</p>
                        <p><b>Typ servisu:</b> {e.service.title || 'Servis'}</p>
                        <p><b>Servis provedl:</b> {e.service.performedBy || '-'}</p>
                        <p style={{ whiteSpace: 'pre-wrap' }}>
                          <b>Provedené práce / poznámka:</b><br />
                          {e.service.note || 'Bez poznámky'}
                        </p>

                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => {
                            if (!window.confirm('Opravdu smazat tento servisní záznam?')) return
                            update(prev => ({
                              ...prev,
                              service: (prev.service || []).filter(x => x.id !== e.service.id)
                            }))
                          }}
                        >
                          🗑️ Smazat servis
                        </button>
                      </div>
                    </details>
                  ) : e.type === 'shift' && e.record?.status !== 'active' ? (
                    <details>
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                        {e.text} · zobrazit detail
                      </summary>
                      <div style={{ marginTop: 10 }}>
                        <div className="shift-detail">
                  <p><b>Obsluha:</b> {e.record?.operator || '–'}</p>
                  <p><b>Zákazník:</b> {e.record?.customer || '–'}</p>
                  <p><b>Druh práce:</b> {e.record?.work || '–'}</p>
                  {e.record?.job && <p><b>Zakázka:</b> {e.record.job}</p>}
                  {e.record?.place && <p><b>Místo / adresa:</b> {e.record.place}</p>}
                  <p><b>Začátek:</b> {e.record?.startTime || e.record?.startedAt || '–'}</p>
                  <p><b>Konec:</b> {e.record?.endTime || e.record?.endedAt || '–'}</p>
                  <p><b>Počáteční MTH / km:</b> {e.record?.startHours || '–'}</p>
                  <p><b>Konečné MTH / km:</b> {e.record?.endHours || '–'}</p>
                  {e.record?.defect && <p><b>Závada:</b> {e.record.defect}</p>}
                  {e.record?.maintenance && <p><b>Údržba:</b> {e.record.maintenance}</p>}
                </div>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => {
                            if (!window.confirm('Opravdu smazat tuto ukončenou směnu?')) return
                            const r = e.record
                            update(prev => ({
                              ...prev,
                              shifts: (prev.shifts || []).filter(x =>
                                r.id
                                  ? x.id !== r.id
                                  : !(
                                      x.machineId === r.machineId &&
                                      x.startedAt === r.startedAt &&
                                      x.endedAt === r.endedAt &&
                                      x.operator === r.operator
                                    )
                              )
                            }))
                          }}
                        >
                          🗑️ Smazat směnu
                        </button>
                      </div>
                    </details>
                  ) : e.type === 'closedFault' ? (
                    <details>
                      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
                        {e.text} · zobrazit detail
                      </summary>
                      <div style={{ marginTop: 10 }}>
                        <p><b>Závada:</b> {e.record?.description || e.text}</p>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => {
                            if (!window.confirm('Opravdu smazat tento záznam uzavřené závady?')) return
                            const r = e.record
                            update(prev => ({
                              ...prev,
                              closedFaults: (prev.closedFaults || []).filter(x =>
                                r.id
                                  ? x.id !== r.id
                                  : !(
                                      x.machineId === r.machineId &&
                                      (x.closedAt || x.date) === (r.closedAt || r.date) &&
                                      x.description === r.description
                                    )
                              )
                            }))
                          }}
                        >
                          🗑️ Smazat uzavřenou závadu
                        </button>
                      </div>
                    </details>
                  ) : (
                    <p>{e.text}</p>
                  )}
                </div>
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
