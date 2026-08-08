
export const uid = () => crypto.randomUUID()

export const isVehicle = m => m.category === 'vehicle'

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('cs-CZ')
}

export function formatTime(value) {
  if (!value) return '—'
  if (/^\d{2}:\d{2}$/.test(value)) return value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
}

export function currentTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function machineStatus(machine, state) {
  const openFault = state.faults.some(f => f.machineId === machine.id && !f.closed)
  if (openFault) return { level: 'bad', label: 'Otevřená závada' }

  const current = Number(machine.hours || 0)
  const interval = Number(machine.serviceInterval || 0)
  const last = Number(machine.lastServiceHours || 0)
  if (interval > 0) {
    const remaining = last + interval - current
    if (remaining < 0) return { level: 'bad', label: `Servis překročen o ${Math.abs(remaining)}` }
    if (remaining <= Math.min(50, interval * 0.1)) return { level: 'warn', label: `Servis za ${remaining}` }
  }
  return { level: 'ok', label: 'V pořádku' }
}
