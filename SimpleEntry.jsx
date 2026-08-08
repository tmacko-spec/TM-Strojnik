
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from './AppContext'
import { uid } from './helpers'

export function FuelForm() {
  const { id } = useParams()
  const { state, update } = useApp()
  const navigate = useNavigate()
  const machine = state.machines.find(m => m.id === id)
  const save = e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const liters = Number(f.get('liters') || 0)
    const price = Number(f.get('price') || 0)
    update(prev => ({ ...prev, fuel: [{
      id: uid(), machineId: id, date: f.get('date'), liters, price, total: liters * price,
      station: String(f.get('station')).trim()
    }, ...prev.fuel] }))
    navigate(`/machine/${id}`)
  }
  return <form className="card form-card" onSubmit={save}><h2>Tankování – {machine?.brand} {machine?.model}</h2><label>Datum<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /></label><label>Litry<input name="liters" type="number" step="0.01" required /></label><label>Cena za litr<input name="price" type="number" step="0.01" required /></label><label>Čerpací stanice<input name="station" /></label><button className="primary">Uložit tankování</button></form>
}

export function ServiceForm() {
  const { id } = useParams()
  const { state, update } = useApp()
  const navigate = useNavigate()
  const machine = state.machines.find(m => m.id === id)
  const save = e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const hours = String(f.get('hours'))
    update(prev => ({
      ...prev,
      machines: prev.machines.map(m => m.id === id ? { ...m, hours, lastServiceHours: f.get('reset') === 'on' ? hours : m.lastServiceHours } : m),
      service: [{ id: uid(), machineId: id, date: f.get('date'), title: String(f.get('title')).trim(), hours, cost: Number(f.get('cost') || 0), note: String(f.get('note')).trim() }, ...prev.service]
    }))
    navigate(`/machine/${id}`)
  }
  return <form className="card form-card" onSubmit={save}><h2>Servis – {machine?.brand} {machine?.model}</h2><label>Datum<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /></label><label>Typ servisu<input name="title" required /></label><label>MTH / km<input name="hours" type="number" step="0.1" defaultValue={machine?.hours || ''} /></label><label>Cena<input name="cost" type="number" step="0.01" /></label><label>Poznámka<textarea name="note" /></label><label className="check"><input name="reset" type="checkbox" /> Nastavit jako poslední servis</label><button className="primary">Uložit servis</button></form>
}

export function FaultForm() {
  const { id } = useParams()
  const { state, update } = useApp()
  const navigate = useNavigate()
  const machine = state.machines.find(m => m.id === id)
  const save = e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    update(prev => ({ ...prev, faults: [{ id: uid(), machineId: id, date: f.get('date'), description: String(f.get('description')).trim(), closed: false }, ...prev.faults] }))
    navigate(`/machine/${id}`)
  }
  return <form className="card form-card" onSubmit={save}><h2>Závada – {machine?.brand} {machine?.model}</h2><label>Datum<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /></label><label>Popis závady<textarea name="description" required /></label><button className="danger-btn">Uložit závadu</button></form>
}
