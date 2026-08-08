
import { Link, useNavigate } from 'react-router-dom'
import { isVehicle, machineStatus } from './helpers'
import { useApp } from './AppContext'

export default function MachineCard({ machine }) {
  const { state } = useApp()
  const navigate = useNavigate()
  const status = machineStatus(machine, state)
  const vehicle = isVehicle(machine)
  const active = state.shifts.find(s => s.status === 'active' && s.machineId === machine.id)

  return (
    <article className={`machine-card pro-card ${status.level}`}>
      <div className="machine-photo-placeholder">
        <div className="photo-icon">{vehicle ? '🚐' : '🚜'}</div>
        <span>{vehicle ? 'AUTOMOBIL' : 'STAVEBNÍ STROJ'}</span>
        {active && <b className="active-badge">Směna probíhá</b>}
      </div>

      <div className="machine-card-body">
        <div className="machine-title-row">
          <div>
            <h3>{machine.brand} {machine.model}</h3>
            <p>{machine.type || (vehicle ? 'Automobil' : 'Stavební stroj')}</p>
          </div>
          <span className={`status-dot-big ${status.level}`} />
        </div>

        <div className={`status-line ${status.level}`}>{status.label}</div>

        <div className="machine-meta-grid">
          <div><small>{vehicle ? 'Kilometry' : 'Motohodiny'}</small><b>{machine.hours || '—'} {vehicle ? 'km' : 'MTH'}</b></div>
          <div><small>Rok výroby</small><b>{machine.year || '—'}</b></div>
        </div>

        <div className="card-actions modern">
          <button onClick={() => navigate(`/shift/start/${machine.id}`)}>▶ Začít směnu</button>
          <Link className="dark-btn" to={`/machine/${machine.id}`}>Otevřít kartu</Link>
          <Link className="light-btn" to={`/machine/${machine.id}/fuel`}>⛽ Tankování</Link>
        </div>
      </div>
    </article>
  )
}
