
import { useRef } from 'react'
import { useApp } from './AppContext'
import { exportState, seed } from './storage'
import { firebaseEnabled } from './firebase'

export default function Settings() {
  const { state, update } = useApp()
  const fileRef = useRef()

  const importData = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    const parsed = JSON.parse(await file.text())
    update({ ...seed, ...parsed })
  }

  return (
    <>
      <section className="card">
        <h2>Stav aplikace</h2>
        <p>Verze: <b>4.0.0</b></p>
        <p>Firebase: <b>{firebaseEnabled ? 'připraveno' : 'nenakonfigurováno – data se bezpečně ukládají v tomto zařízení'}</b></p>
        <p>Režim instalace: <b>PWA připravena pro plochu iPhonu/iPadu</b></p>
      </section>

      <section className="card">
        <h2>Záloha dat</h2>
        <div className="settings-actions">
          <button onClick={() => exportState(state)}>Stáhnout zálohu</button>
          <button onClick={() => fileRef.current?.click()}>Obnovit zálohu</button>
          <input ref={fileRef} hidden type="file" accept=".json" onChange={importData} />
        </div>
      </section>

      <section className="card">
        <h2>Číselníky</h2>
        <p><b>Obsluha:</b> {state.operators.join(', ') || 'zatím prázdné'}</p>
        <p><b>Zákazníci:</b> {state.customers.join(', ') || 'zatím prázdné'}</p>
        <p><b>Druhy práce:</b> {state.workTypes.join(', ')}</p>
      </section>
    </>
  )
}
