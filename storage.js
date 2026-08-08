
const KEY = 'tm-strojnik-v4-state'
const LEGACY_KEYS = ['tm-strojnik-v3-state', 'tm13-machines']

export const seed = {
  machines: [],
  shifts: [],
  fuel: [],
  service: [],
  faults: [],
  inspections: [],
  documents: [],
  operators: [],
  customers: [],
  workTypes: ['Výkopové práce', 'Nakládání', 'Hutnění', 'Demolice', 'Doprava', 'Údržba'],
  settings: { companyName: 'TM-Strojník', pinEnabled: false }
}

export function loadState() {
  try {
    let raw = localStorage.getItem(KEY)
    if (!raw) {
      for (const legacyKey of LEGACY_KEYS) {
        raw = localStorage.getItem(legacyKey)
        if (raw) break
      }
    }
    const parsed = JSON.parse(raw || 'null')
    if (!parsed) return structuredClone(seed)
    const migrated = {
      ...seed,
      ...parsed,
      machines: Array.isArray(parsed.machines) ? parsed.machines : [],
      shifts: Array.isArray(parsed.shifts) ? parsed.shifts : [],
      fuel: Array.isArray(parsed.fuel) ? parsed.fuel : [],
      service: Array.isArray(parsed.service) ? parsed.service : [],
      faults: Array.isArray(parsed.faults) ? parsed.faults : [],
      inspections: Array.isArray(parsed.inspections) ? parsed.inspections : [],
      documents: Array.isArray(parsed.documents) ? parsed.documents : [],
      operators: Array.isArray(parsed.operators) ? parsed.operators : [],
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      workTypes: Array.isArray(parsed.workTypes) && parsed.workTypes.length ? parsed.workTypes : seed.workTypes
    }
    localStorage.setItem(KEY, JSON.stringify(migrated))
    return migrated
  } catch (error) {
    console.warn('Lokální data se nepodařilo načíst:', error)
    return structuredClone(seed)
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tm-strojnik-zaloha-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
