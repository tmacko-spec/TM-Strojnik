import { useState } from 'react'

import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from './AppContext'
import { uid } from './helpers'
import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export default function MachineForm() {
  const { id } = useParams()
  const { state, update } = useApp()
  const navigate = useNavigate()
  const existing = state.machines.find(m => m.id === id)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(existing?.photo || '')
  const [photoUploading, setPhotoUploading] = useState(false)

  const initial = existing || {
    category: '',
    brand: '', model: '', type: '', year: '',
    hours: '', serial: '', serviceInterval: '', lastServiceHours: '', note: ''
  }

  const archiveMachine = () => {
    if (!existing) return
    if (!window.confirm(`Opravdu odebrat ${existing.category === 'vehicle' ? 'automobil' : 'stroj'}? Historie zůstane zachována.`)) return

    update(prev => ({
      ...prev,
      machines: prev.machines.map(m =>
        m.id === existing.id ? { ...m, archived: true } : m
      )
    }))

    navigate('/')
  }

  const save = async e => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)

    const machineId = existing?.id || uid()
    let photo = existing?.photo || ''

    try {
      if (photoFile) {
        setPhotoUploading(true)

        const safeName = photoFile.name
          .replace(/[^a-zA-Z0-9._-]/g, '_')

        const photoRef = ref(
          storage,
          `machines/${machineId}/${Date.now()}-${safeName}`
        )

        await uploadBytes(photoRef, photoFile)
        photo = await getDownloadURL(photoRef)
      }

      const machine = {
        id: machineId,
        category: f.get('category'),
        brand: String(f.get('brand')).trim(),
        model: String(f.get('model')).trim(),
        type: String(f.get('type')).trim(),
        year: String(f.get('year')),
        hours: String(f.get('hours')),
        serial: String(f.get('serial')).trim(),
        serviceInterval: String(f.get('serviceInterval')),
        lastServiceHours: String(f.get('lastServiceHours')),
        note: String(f.get('note')).trim(),
        photo
      }

      update(prev => ({
        ...prev,
        machines: existing
          ? prev.machines.map(m => m.id === existing.id ? machine : m)
          : [machine, ...prev.machines]
      }))

      navigate('/')
    } catch (err) {
      console.error(err)
      alert('Fotografii se nepodařilo uložit. Zkus to znovu.')
    } finally {
      setPhotoUploading(false)
    }
  }

  return (
    <form className="card form-card" onSubmit={save}>
      <h2>{existing ? 'Upravit techniku' : 'Přidat techniku'}</h2>

      <label>Zařazení techniky
        <select name="category" defaultValue={initial.category} required>
          <option value="">Vyber</option>
          <option value="machine">🚜 Stavební stroj</option>
          <option value="vehicle">🚐 Automobil</option>
        </select>
      </label>

      <div className="form-grid">
        <label>Značka<input name="brand" defaultValue={initial.brand} required /></label>
        <label>Model<input name="model" defaultValue={initial.model} required /></label>
      </div>
      <label>Typ<input name="type" defaultValue={initial.type} placeholder="Minirypadlo, dodávka…" /></label>
      <div className="form-grid">
        <label>Rok výroby<input name="year" type="number" defaultValue={initial.year} /></label>
        <label>MTH / km<input name="hours" type="number" step="0.1" defaultValue={initial.hours} /></label>
      </div>
      <label>VIN / výrobní číslo / SPZ<input name="serial" defaultValue={initial.serial} /></label>
      <div className="form-grid">
        <label>Servisní interval<input name="serviceInterval" type="number" defaultValue={initial.serviceInterval} /></label>
        <label>Poslední servis při<input name="lastServiceHours" type="number" defaultValue={initial.lastServiceHours} /></label>
      </div>
      <div className="machine-photo-editor">
        <label>
          📷 Fotografie stroje / automobilu
          <input
            type="file"
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              setPhotoFile(file)
              setPhotoPreview(URL.createObjectURL(file))
            }}
          />
        </label>

        {photoPreview && (
          <div className="machine-photo-preview-wrap">
            <img
              src={photoPreview}
              alt="Náhled fotografie"
              className="machine-photo-preview"
            />
            <button
              type="button"
              className="light-btn"
              onClick={() => {
                setPhotoFile(null)
                setPhotoPreview('')
              }}
            >
              Odebrat vybranou fotografii
            </button>
          </div>
        )}
      </div>

      <label>Poznámka<textarea name="note" defaultValue={initial.note} /></label>
      <button className="primary" disabled={photoUploading}>
        {photoUploading ? 'Nahrávám fotografii…' : 'Uložit'}
      </button>

      {existing && (
        <button
          type="button"
          onClick={archiveMachine}
          style={{
            marginTop: 14,
            width: "100%",
            padding: 14,
            borderRadius: 12,
            border: "1px solid #b91c1c",
            background: "#fee2e2",
            color: "#991b1b",
            fontWeight: 800
          }}
        >
          Odebrat {existing.category === 'vehicle' ? 'automobil' : 'stroj'}
        </button>
      )}
    </form>
  )
}
