import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect
} from 'react'

import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase'
import { loadState, saveState } from './storage'

const AppContext = createContext(null)

const CLOUD_COLLECTION = 'tm-strojnik'
const CLOUD_DOCUMENT = 'shared-state'

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState)
  const [cloudReady, setCloudReady] = useState(false)

  const cloudRef = useMemo(() => {
    if (!firebaseEnabled || !db) return null
    return doc(db, CLOUD_COLLECTION, CLOUD_DOCUMENT)
  }, [])

  useEffect(() => {
    if (!cloudRef) {
      console.warn('Firebase není aktivní - používám pouze lokální data.')
      setCloudReady(true)
      return
    }

    let unsubscribe = () => {}
    let cancelled = false

    const startSync = async () => {
      try {
        const snapshot = await getDoc(cloudRef)

        if (cancelled) return

        if (snapshot.exists()) {
          const cloudState = snapshot.data()?.state

          if (cloudState && typeof cloudState === 'object') {
            console.log('☁️ Načítám data z Firestore')
            saveState(cloudState)
            setState(cloudState)
          }
        } else {
          console.log('☁️ Firestore je prázdný - nahrávám lokální data')
          const localState = loadState()

          await setDoc(cloudRef, {
            state: localState,
            updatedAt: new Date().toISOString()
          })
        }

        if (cancelled) return

        setCloudReady(true)

        unsubscribe = onSnapshot(
          cloudRef,
          snap => {
            if (!snap.exists()) return

            const cloudState = snap.data()?.state
            if (!cloudState || typeof cloudState !== 'object') return

            setState(current => {
              try {
                if (JSON.stringify(current) === JSON.stringify(cloudState)) {
                  return current
                }
              } catch {}

              console.log('🔄 Přijata změna z Firestore')
              saveState(cloudState)
              return cloudState
            })
          },
          error => {
            console.error('Firestore synchronizace:', error)
          }
        )
      } catch (error) {
        console.error('Firestore start synchronizace:', error)
        setCloudReady(true)
      }
    }

    startSync()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [cloudRef])

  const update = updater => {
    setState(prev => {
      const next =
        typeof updater === 'function'
          ? updater(prev)
          : updater

      saveState(next)

      if (cloudRef && cloudReady) {
        setDoc(cloudRef, {
          state: next,
          updatedAt: new Date().toISOString()
        }).catch(error => {
          console.error('Firestore zápis:', error)
        })
      }

      return next
    })
  }

  const value = useMemo(
    () => ({
      state,
      update,
      cloudReady
    }),
    [state, cloudReady]
  )

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)

  if (!ctx) {
    throw new Error('useApp musí být uvnitř AppProvider')
  }

  return ctx
}
