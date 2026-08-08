
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from './AppContext'
import { uid } from './helpers'

export default function MachineForm() {
  const { id } = useParams()
  const { state, update } = useApp()
  const navigate = useNavigate()
  const existing = state.machines.find(m => m.id === id)
  const initial = existing || {
    category: '',
    brand: '', model: '', type: '', year: '',
    hours: '', serial: '', serviceInterval: '', lastServiceHours: '', note: ''
  }

  const save = e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const machine = {
      id: existing?.id || uid(),
      category: f.get('category'),
      brand: String(f.get('brand')).trim(),
      model: String(f.get('model')).trim(),
      type: String(f.get('type')).trim(),
      year: String(f.get('year')),
      hours: String(f.get('hours')),
      serial: String(f.get('serial')).trim(),
      serviceInterval: String(f.get('serviceInterval')),
      lastServiceHours: String(f.get('lastServiceHours')),
      note: String(f.get('note')).trim()
    }
    update(prev => ({
      ...prev,
      machines: existing ? prev.machines.map(m => m.id === existing.id ? machine : m) : [machine, ...prev.machines]
    }))
    navigate('/')
  }

  return (
    <form className="card form-card" onSubmit={save}>
      <h2>{existing ? 'Upravit techniku' : 'Přidat techniku'}</h2>

      <label>Zařazení techniky
        <select name="category" defaultValue={initial.category} required>
          <option value="">Vyber</option>
          <option value="machine">🚜 Stavební stroj</option>
          <option value="vehicle">🚐 Automobil</option>
        </select>
      </label>

      <div className="form-grid">
        <label>Značka<input name="brand" defaultValue={initial.brand} required /></label>
        <label>Model<input name="model" defaultValue={initial.model} required /></label>
      </div>
      <label>Typ<input name="type" defaultValue={initial.type} placeholder="Minirypadlo, dodávka…" /></label>
      <div className="form-grid">
        <label>Rok výroby<input name="year" type="number" defaultValue={initial.year} /></label>
        <label>MTH / km<input name="hours" type="number" step="0.1" defaultValue={initial.hours} /></label>
      </div>
      <label>VIN / výrobní číslo / SPZ<input name="serial" defaultValue={initial.serial} /></label>
      <div className="form-grid">
        <label>Servisní interval<input name="serviceInterval" type="number" defaultValue={initial.serviceInterval} /></label>
        <label>Poslední servis při<input name="lastServiceHours" type="number" defaultValue={initial.lastServiceHours} /></label>
      </div>
      <label>Poznámka<textarea name="note" defaultValue={initial.note} /></label>
      <button className="primary">Uložit</button>
    </form>
  )
}
