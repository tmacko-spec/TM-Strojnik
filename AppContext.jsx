import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef
} from 'react'

import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, firebaseEnabled } from './firebase'
import { loadState, saveState } from './storage'

const AppContext = createContext(null)

const CLOUD_COLLECTION = 'tm-strojnik'
const CLOUD_DOCUMENT = 'shared-state'

const PHOTO_COLLECTION = 'tm-strojnik-photos'

const stripPhotos = source => ({
  ...source,
  machines: (source?.machines || []).map(machine => {
    const { photo, ...rest } = machine || {}
    return rest
  })
})

const hydratePhotos = async source => {
  if (!db || !source || !Array.isArray(source.machines)) return source

  const machines = await Promise.all(
    source.machines.map(async machine => {
      if (!machine?.id) return machine

      try {
        const snap = await getDoc(
          doc(db, PHOTO_COLLECTION, String(machine.id))
        )

        const storedPhoto = snap.exists()
          ? snap.data()?.photo || ''
          : ''

        const photo = storedPhoto || machine.photo || ''

        return photo ? { ...machine, photo } : machine
      } catch (error) {
        console.error('Načtení fotografie:', error)
        return machine
      }
    })
  )

  return { ...source, machines }
}


export function AppProvider({ children }) {
  const [state, setState] = useState(loadState)

  const latestStateRef = useRef(state)

  const writeCloudState = async fullState => {
    if (!cloudRef || !db) return

    const now = new Date().toISOString()
    const machines = fullState?.machines || []

    await Promise.all(
      machines
        .filter(machine => machine?.id && machine?.photo)
        .map(machine =>
          setDoc(
            doc(db, PHOTO_COLLECTION, String(machine.id)),
            {
              photo: machine.photo,
              updatedAt: now
            }
          )
        )
    )

    await setDoc(cloudRef, {
      state: stripPhotos(fullState),
      updatedAt: now
    })
  }

  useEffect(() => {
    latestStateRef.current = state
  }, [state])
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
            const hydratedState = await hydratePhotos(cloudState)
            latestStateRef.current = hydratedState
            saveState(hydratedState)
            setState(hydratedState)
          }
        } else {
          console.log('☁️ Firestore je prázdný - nahrávám lokální data')
          const localState = loadState()

          await writeCloudState(localState)
        }

        if (cancelled) return

        setCloudReady(true)

        unsubscribe = onSnapshot(
          cloudRef,
          async snap => {
            if (!snap.exists()) return

            const cloudState = snap.data()?.state
            if (!cloudState || typeof cloudState !== 'object') return

            const hydratedState = await hydratePhotos(cloudState)

            setState(current => {
              try {
                if (JSON.stringify(current) === JSON.stringify(hydratedState)) {
                  return current
                }
              } catch {}

              console.log('🔄 Přijata změna z Firestore')
              latestStateRef.current = hydratedState
              saveState(hydratedState)
              return hydratedState
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
    const prev = latestStateRef.current
    const next =
      typeof updater === 'function'
        ? updater(prev)
        : updater

    latestStateRef.current = next
    setState(next)
    saveState(next)

    if (cloudRef && cloudReady) {
      writeCloudState(next).catch(error => {
        console.error('Firestore zápis:', error)
      })
    }

    return next
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
