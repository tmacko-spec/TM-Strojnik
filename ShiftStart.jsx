import { useState } from 'react'

import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from './AppContext'
import { currentTime, uid } from './helpers'

export default function ShiftStart() {
  const { machineId } = useParams()
  const { state, update } = useApp()
  const navigate = useNavigate()
  const [gps, setGps] = useState(null)
  const [gpsStatus, setGpsStatus] = useState('')

  const getGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS není v tomto zařízení dostupná')
      return
    }

    setGpsStatus('Zjišťuji polohu…')

    navigator.geolocation.getCurrentPosition(
      pos => {
        const data = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        }
        setGps(data)
        setGpsStatus(`Poloha načtena ±${Math.round(pos.coords.accuracy)} m`)

        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${data.latitude}&lon=${data.longitude}`)
          .then(r => r.json())
          .then(result => {
            const address = result?.display_name || ''
            const placeInput = document.querySelector('input[name="place"]')
            if (placeInput && address) placeInput.value = address
          })
          .catch(() => {
            // GPS zůstane uložená i když se adresu nepodaří získat
          })
      },
      err => {
        setGpsStatus('Polohu se nepodařilo načíst: ' + err.message)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    )
  }
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
      latitude: gps?.latitude ?? null,
      longitude: gps?.longitude ?? null,
      gpsAccuracy: gps?.accuracy ?? null,
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
      <label>Obsluha
        <select name="operator" defaultValue={last?.operator || ''} required>
          <option value="">Vyber obsluhu</option>
          {state.operators.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>

      <label>Zákazník
        <select name="customer" defaultValue={last?.customer || ''} required>
          <option value="">Vyber zákazníka</option>
          {state.customers.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>

      <label>Druh práce
        <select name="work" defaultValue={last?.work || ''} required>
          <option value="">Vyber druh práce</option>
          {state.workTypes.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </label>
      <label>Zakázka<input name="job" defaultValue={last?.job || ''} /></label>
      <label>Místo<input name="place" defaultValue={last?.place || ''} /></label>

      <button
        type="button"
        onClick={getGps}
        style={{ marginBottom: 12 }}
      >
        📍 Načíst aktuální polohu
      </button>

      {gpsStatus && (
        <div className="notice">
          {gpsStatus}
          {gps && (
            <small style={{display:'block', marginTop:6}}>
              {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
            </small>
          )}
        </div>
      )}
      <label>Počáteční MTH / km<input name="startHours" type="number" step="0.1" defaultValue={machine.hours || ''} required /></label>
      <button className="primary">▶ Zahájit směnu</button>
    </form>
  )
}
