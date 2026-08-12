import { useParams } from 'react-router-dom'
import { useApp } from './AppContext'
import { formatDate, formatTime } from './helpers'


function shortAddress(value) {
  if (!value) return '—'

  const parts = String(value)
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)

  if (parts.length <= 3) return value

  const useful = parts.filter(x =>
    !/^okres\b/i.test(x) &&
    !/kraj$/i.test(x) &&
    !/^\d{3}\s?\d{2}$/.test(x) &&
    !/^(Česko|Czechia|Czech Republic)$/i.test(x)
  )

  // typická stará adresa:
  // provozovna, ulice, čtvrť..., město...
  if (useful.length >= 3) {
    const street = useful[1]
    const city =
      useful.find(x => /^Pardubice$/i.test(x)) ||
      useful[useful.length - 1]

    return [street, city].filter(Boolean).join(', ')
  }

  return useful.join(', ') || value
}

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
        <h1 style={{ marginTop: 0, fontSize: 24 }}>TM-Strojník – Provozní deník stroje</h1>

        <p><b>Stroj:</b> {machine.brand} {machine.model}</p>
        {machine.serial && <p><b>VIN / výrobní číslo / SPZ:</b> {machine.serial}</p>}

        <div style={{ overflowX: 'auto', marginTop: 20 }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 820
            }}
          >
            <thead>
              <tr>
                {[
                  'Datum',
                  'Obsluha',
                  'Zákazník',
                  'Práce',
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
                      padding: '6px 5px',
                      textAlign: 'left',
                      verticalAlign: 'top',
                      fontSize: 13,
                      lineHeight: 1.2,
                      whiteSpace: 'normal'
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
                  <td style={cell}>{shortAddress(s.place)}</td>
                  <td style={cell}>{formatTime(s.startTime || s.startedAt)}</td>
                  <td style={cell}>{formatTime(s.endTime || s.endedAt)}</td>
                  <td style={cell}>{s.startHours || '—'}</td>
                  <td style={cell}>{s.endHours || '—'}</td>
                  <td style={cell}>{s.defect || '—'}</td>
                  <td style={cell}>{s.maintenance || s.note || '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td style={cell} colSpan="11">Zatím nejsou žádné směny.</td>
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
        @page {
          size: A4 landscape;
          margin: 10mm;
        }

        @media print {
          .no-print,
          header,
          nav,
          footer {
            display: none !important;
          }

          body {
            background: white !important;
            font-size: 10px !important;
          }

          main {
            padding: 0 !important;
          }

          .card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }

          table {
            min-width: 0 !important;
            width: 100% !important;
            font-size: 9px !important;
          }

          th, td {
            padding: 3px !important;
          }
        }
      `}</style>
    </div>
  )
}

const cell = {
  border: '1px solid #bbb',
  padding: '6px 5px',
  verticalAlign: 'top',
  fontSize: 13,
  lineHeight: 1.2,
  wordBreak: 'normal'
}
