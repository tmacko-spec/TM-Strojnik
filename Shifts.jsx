
import { useApp } from './AppContext'
import { currentTime, formatDate, formatTime } from './helpers'

export default function Shifts() {
  const { state, update } = useApp()
  const active = state.shifts.find(s => s.status === 'active')
  const machine = active && state.machines.find(m => m.id === active.machineId)

  const endShift = e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const endHours = String(f.get('endHours'))
    const now = new Date()
    update(prev => ({
      ...prev,
      machines: prev.machines.map(m => m.id === active.machineId ? { ...m, hours: endHours } : m),
      shifts: prev.shifts.map(s => s.id === active.id ? {
        ...s, status: 'closed', endHours, endTime: currentTime(), endedAt: now.toISOString(),
        defect: String(f.get('defect')).trim(), maintenance: String(f.get('maintenance')).trim()
      } : s),
      faults: String(f.get('defect')).trim() ? [{
        id: crypto.randomUUID(), machineId: active.machineId, date: now.toISOString().slice(0, 10),
        description: String(f.get('defect')).trim(), closed: false
      }, ...prev.faults] : prev.faults
    }))
  }

  return (
    <>
      {active && (
        <form className="card form-card" onSubmit={endShift}>
          <h2>Probíhající směna</h2>
          <p><b>{machine?.brand} {machine?.model}</b></p>
          <p>{active.operator} · {active.customer}</p>
          <p>Začátek: {formatTime(active.startTime || active.startedAt)}</p>
          <label>Konečné MTH / km<input name="endHours" type="number" step="0.1" defaultValue={machine?.hours || active.startHours} required /></label>
          <label>Zjištěná závada<textarea name="defect" /></label>
          <label>Provedená údržba<textarea name="maintenance" /></label>
          <button className="danger-btn">⏹ Ukončit směnu</button>
        </form>
      )}

      <h2>Historie směn</h2>
      <div className="list-stack">
        {state.shifts.map(s => {
          const m = state.machines.find(x => x.id === s.machineId)
          return <article className="card" key={s.id}>
            <small>{s.status === 'active' ? 'Probíhá' : formatDate(s.date)}</small>
            <h3>{m?.brand} {m?.model}</h3>
            <p>{s.operator} · {s.customer || 'Bez zákazníka'}</p>
            <p>{formatTime(s.startTime || s.startedAt)}–{formatTime(s.endTime || s.endedAt)}</p>
          </article>
        })}
      </div>
    </>
  )
}
