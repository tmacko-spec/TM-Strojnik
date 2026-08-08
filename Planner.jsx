
import { useMemo } from 'react'
import { useApp } from './AppContext'
import { formatDate, uid } from './helpers'

const TYPES = ['STK', 'Emise', 'Revize', 'Pojištění', 'Servis', 'Kontrola hasicího přístroje', 'Jiné']

function daysUntil(date) {
  if (!date) return null
  const today = new Date()
  today.setHours(0,0,0,0)
  const due = new Date(`${date}T12:00:00`)
  return Math.ceil((due - today) / 86400000)
}

export default function Planner() {
  const { state, update } = useApp()

  const rows = useMemo(() => {
    return [...state.inspections]
      .map(item => ({ ...item, days: daysUntil(item.date) }))
      .sort((a,b) => String(a.date).localeCompare(String(b.date)))
  }, [state.inspections])

  const save = e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    update(prev => ({
      ...prev,
      inspections: [{
        id: uid(),
        machineId: f.get('machineId'),
        type: f.get('type'),
        date: f.get('date'),
        note: String(f.get('note')).trim(),
        done: false
      }, ...prev.inspections]
    }))
    e.currentTarget.reset()
  }

  const toggle = id => update(prev => ({
    ...prev,
    inspections: prev.inspections.map(x => x.id === id ? { ...x, done: !x.done } : x)
  }))

  const remove = id => {
    if (!confirm('Odstranit tento termín?')) return
    update(prev => ({ ...prev, inspections: prev.inspections.filter(x => x.id !== id) }))
  }

  return (
    <>
      <section className="planner-hero">
        <div>
          <span className="eyebrow">PLÁN ÚDRŽBY A TERMÍNŮ</span>
          <h2>Servisy, revize a zákonné kontroly</h2>
          <p>Všechny důležité termíny na jednom místě.</p>
        </div>
        <div className="planner-summary">
          <div><small>Celkem</small><b>{rows.length}</b></div>
          <div><small>Do 30 dnů</small><b>{rows.filter(x => !x.done && x.days !== null && x.days <= 30).length}</b></div>
          <div><small>Po termínu</small><b>{rows.filter(x => !x.done && x.days !== null && x.days < 0).length}</b></div>
        </div>
      </section>

      <form className="card form-card planner-form" onSubmit={save}>
        <h3>Přidat termín</h3>
        <div className="form-grid">
          <label>Technika
            <select name="machineId" required>
              <option value="">Vyber techniku</option>
              {state.machines.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model}</option>)}
            </select>
          </label>
          <label>Typ
            <select name="type" required>
              {TYPES.map(x => <option key={x}>{x}</option>)}
            </select>
          </label>
        </div>
        <label>Datum<input name="date" type="date" required /></label>
        <label>Poznámka<textarea name="note" placeholder="Číslo smlouvy, rozsah kontroly, kontakt…" /></label>
        <button className="primary">＋ Přidat termín</button>
      </form>

      <section className="planner-list">
        {rows.length ? rows.map(item => {
          const machine = state.machines.find(m => m.id === item.machineId)
          const level = item.done ? 'done' : item.days < 0 ? 'bad' : item.days <= 30 ? 'warn' : 'ok'
          return (
            <article key={item.id} className={`planner-item ${level}`}>
              <div className="planner-date">
                <b>{formatDate(item.date)}</b>
                <small>{item.done ? 'Splněno' : item.days < 0 ? `${Math.abs(item.days)} dnů po termínu` : item.days === 0 ? 'Dnes' : `Za ${item.days} dnů`}</small>
              </div>
              <div className="planner-main">
                <span>{item.type}</span>
                <h3>{machine ? `${machine.brand} ${machine.model}` : 'Neznámá technika'}</h3>
                {item.note && <p>{item.note}</p>}
              </div>
              <div className="planner-actions">
                <button onClick={() => toggle(item.id)}>{item.done ? 'Vrátit' : '✓ Splněno'}</button>
                <button className="danger-small" onClick={() => remove(item.id)}>Odstranit</button>
              </div>
            </article>
          )
        }) : <div className="empty">Zatím nejsou naplánované žádné termíny.</div>}
      </section>
    </>
  )
}
