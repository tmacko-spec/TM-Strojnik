import { useParams } from 'react-router-dom'
import { useApp } from './AppContext'
import { formatDate, formatTime } from './helpers'

export default function Logbook() {
  const { id } = useParams()
  const { state } = useApp()

  const machine = state.machines.find(m => m.id === id)
  const shifts = state.shifts
    .filter(s => s.machineId === id)
    .slice()
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))

  if (!machine) {
    return <div className="empty">Technika nebyla nalezena.</div>
  }

  return (
    <div style={{ padding: 20 }}>
      <div className="no-print" style={{ marginBottom: 18 }}>
        <h2>📘 Provozní deník</h2>
        <p><b>{machine.brand} {machine.model}</b></p>

        <button
          className="primary"
          onClick={() => window.print()}
          style={{ marginTop: 10 }}
        >
          🖨️ Tisk / uložit jako PDF
        </button>
      </div>

      <section className="card">
        <h1 style={{ marginTop: 0 }}>TM-Strojník – Provozní deník stroje</h1>

        <p><b>Stroj:</b> {machine.brand} {machine.model}</p>
        {machine.serial && <p><b>VIN / výrobní číslo / SPZ:</b> {machine.serial}</p>}

        <div style={{ overflowX: 'auto', marginTop: 20 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 950
            }}
          >
            <thead>
              <tr>
                {[
                  'Datum',
                  'Obsluha',
                  'Zákazník',
                  'Práce',
                  'Zakázka',
                  'Adresa',
                  'Začátek',
                  'Konec',
                  'MTH / km od',
                  'MTH / km do',
                  'Závada / odstavení',
                  'Údržba / poznámka'
                ].map(x => (
                  <th
                    key={x}
                    style={{
                      border: '1px solid #bbb',
                      padding: 8,
                      textAlign: 'left',
                      verticalAlign: 'top'
                    }}
                  >
                    {x}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {shifts.length ? shifts.map(s => (
                <tr key={s.id}>
                  <td style={cell}>{formatDate(s.date)}</td>
                  <td style={cell}>{s.operator || '—'}</td>
                  <td style={cell}>{s.customer || '—'}</td>
                  <td style={cell}>{s.work || '—'}</td>
                  <td style={cell}>{s.job || '—'}</td>
                  <td style={cell}>{s.place || '—'}</td>
                  <td style={cell}>{formatTime(s.startTime || s.startedAt)}</td>
                  <td style={cell}>{formatTime(s.endTime || s.endedAt)}</td>
                  <td style={cell}>{s.startHours || '—'}</td>
                  <td style={cell}>{s.endHours || '—'}</td>
                  <td style={cell}>{s.defect || '—'}</td>
                  <td style={cell}>{s.maintenance || s.note || '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td style={cell} colSpan="12">Zatím nejsou žádné směny.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
          Tento výstup nenahrazuje návod výrobce, revizní zprávy ani další povinnou provozní dokumentaci.
        </p>
      </section>

      <style>{`
        @media print {
          .no-print,
          header,
          nav,
          footer {
            display: none !important;
          }

          body {
            background: white !important;
          }

          main {
            padding: 0 !important;
          }

          .card {
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  )
}

const cell = {
  border: '1px solid #bbb',
  padding: 8,
  verticalAlign: 'top'
}
