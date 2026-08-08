
import { createContext, useContext, useMemo, useState } from 'react'
import { loadState, saveState } from './storage'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState)

  const update = updater => {
    setState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      saveState(next)
      return next
    })
  }

  const value = useMemo(() => ({ state, update }), [state])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp musí být uvnitř AppProvider')
  return ctx
}
