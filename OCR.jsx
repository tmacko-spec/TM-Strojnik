
import { useState } from 'react'
import Tesseract from 'tesseract.js'
import { useApp } from './AppContext'
import { uid } from './helpers'

export function OcrMeter() {
  const { state, update } = useApp()
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState('')

  const run = async e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const file = f.get('image')
    const machineId = f.get('machineId')
    setProgress('Spouštím OCR…')
    const { data } = await Tesseract.recognize(file, 'eng', { logger: m => setProgress(`${m.status} ${m.progress ? Math.round(m.progress*100)+' %' : ''}`) })
    const candidates = (data.text.replace(/\s/g,'').replace(',','.').match(/\d{2,}(?:\.\d+)?/g) || [])
    const value = candidates.sort((a,b)=>b.length-a.length)[0] || ''
    setResult(value)
    if (value) update(prev => ({ ...prev, machines: prev.machines.map(m => m.id === machineId ? { ...m, hours: value } : m) }))
  }

  return <form className="card form-card" onSubmit={run}><h2>📷 Načíst MTH / km</h2><label>Technika<select name="machineId" required><option value="">Vyber</option>{state.machines.map(m=><option key={m.id} value={m.id}>{m.brand} {m.model}</option>)}</select></label><label>Fotografie<input name="image" type="file" accept="image/*" capture="environment" required /></label><button className="primary">Rozpoznat</button><p>{progress}</p>{result && <div className="notice">Rozpoznaná hodnota: <b>{result}</b></div>}</form>
}

export function OcrReceipt() {
  const { state, update } = useApp()
  const [progress, setProgress] = useState('')
  const [text, setText] = useState('')

  const run = async e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const file = f.get('image')
    setProgress('Spouštím OCR…')
    const { data } = await Tesseract.recognize(file, 'eng', { logger: m => setProgress(`${m.status} ${m.progress ? Math.round(m.progress*100)+' %' : ''}`) })
    setText(data.text)
  }

  const save = e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    update(prev => ({ ...prev, fuel: [{
      id: uid(), machineId: f.get('machineId'), date: f.get('date'),
      liters: Number(f.get('liters')||0), price: Number(f.get('price')||0),
      total: Number(f.get('liters')||0)*Number(f.get('price')||0),
      station: String(f.get('station')).trim(), note: 'Načteno z účtenky'
    }, ...prev.fuel] }))
  }

  return <><form className="card form-card" onSubmit={run}><h2>🧾 Načíst účtenku</h2><label>Fotografie<input name="image" type="file" accept="image/*" capture="environment" required /></label><button className="primary">Rozpoznat</button><p>{progress}</p></form>{text && <form className="card form-card" onSubmit={save}><label>Technika<select name="machineId" required><option value="">Vyber</option>{state.machines.map(m=><option key={m.id} value={m.id}>{m.brand} {m.model}</option>)}</select></label><label>Datum<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label><label>Litry<input name="liters" type="number" step="0.01" /></label><label>Cena za litr<input name="price" type="number" step="0.01" /></label><label>Čerpací stanice<input name="station" /></label><details><summary>Rozpoznaný text</summary><pre>{text}</pre></details><button className="primary">Uložit tankování</button></form>}</>
}
