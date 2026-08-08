
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from './AppContext'
import { currentTime, uid } from './helpers'

export default function ShiftStart() {
  const { machineId } = useParams()
  const { state, update } = useApp()
  const navigate = useNavigate()
  const machine = state.machines.find(m => m.id === machineId)
  const last = [...state.shifts].find(s => s.machineId === machineId)

  if (!machine) return <div className="empty">Technika nebyla nalezena.</div>
  if (state.shifts.some(s => s.status === 'active')) return <div className="empty">Jiná směna už probíhá.</div>

  const save = e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const operator = String(f.get('operator')).trim()
    const customer = String(f.get('customer')).trim()
    const work = String(f.get('work')).trim()
    const now = new Date()

    update(prev => ({
      ...prev,
      operators: operator && !prev.operators.includes(operator) ? [operator, ...prev.operators] : prev.operators,
      customers: customer && !prev.customers.includes(customer) ? [customer, ...prev.customers] : prev.customers,
      workTypes: work && !prev.workTypes.includes(work) ? [work, ...prev.workTypes] : prev.workTypes,
      shifts: [{
        id: uid(), status: 'active', machineId,
        operator, customer, work,
        job: String(f.get('job')).trim(),
        place: String(f.get('place')).trim(),
        startHours: String(f.get('startHours')),
        startTime: currentTime(),
        startedAt: now.toISOString(),
        date: now.toISOString().slice(0, 10)
      }, ...prev.shifts]
    }))
    navigate('/shifts')
  }

  return (
    <form className="card form-card" onSubmit={save}>
      <h2>Začít směnu</h2>
      <div className="notice"><b>{machine.brand} {machine.model}</b></div>
      <label>Čas začátku<input value={currentTime()} readOnly /></label>
      <label>Obsluha<input name="operator" list="operators" defaultValue={last?.operator || ''} required /></label>
      <datalist id="operators">{state.operators.map(x => <option key={x} value={x} />)}</datalist>
      <label>Zákazník<input name="customer" list="customers" defaultValue={last?.customer || ''} required /></label>
      <datalist id="customers">{state.customers.map(x => <option key={x} value={x} />)}</datalist>
      <label>Druh práce<input name="work" list="workTypes" defaultValue={last?.work || ''} required /></label>
      <datalist id="workTypes">{state.workTypes.map(x => <option key={x} value={x} />)}</datalist>
      <label>Zakázka<input name="job" defaultValue={last?.job || ''} /></label>
      <label>Místo<input name="place" defaultValue={last?.place || ''} /></label>
      <label>Počáteční MTH / km<input name="startHours" type="number" step="0.1" defaultValue={machine.hours || ''} required /></label>
      <button className="primary">▶ Zahájit směnu</button>
    </form>
  )
}
