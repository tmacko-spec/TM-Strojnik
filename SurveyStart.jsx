import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Survey.css'

export default function SurveyStart() {
  const navigate = useNavigate()
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')

  const a = Number(String(length).replace(',', '.')) || 0
  const b = Number(String(width).replace(',', '.')) || 0
  const diagonal = a > 0 && b > 0
    ? Math.sqrt(a * a + b * b)
    : 0

  return (
    <div className="survey-page">
      <header className="survey-header">
        <button type="button" onClick={() => navigate('/')}>
          ← Zpět
        </button>
        <h1>Výpočet úhlopříčky</h1>
      </header>

      <section className="survey-hero">
        <h2>📐 Kontrola pravoúhlosti</h2>
        <p>
          Zadej délku a šířku. Pro správný obdélník musí mít obě
          úhlopříčky stejnou vypočtenou délku.
        </p>

        <label>
          Délka
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={length}
            onChange={e => setLength(e.target.value)}
            placeholder="např. 32"
          />
        </label>

        <label>
          Šířka
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={width}
            onChange={e => setWidth(e.target.value)}
            placeholder="např. 18"
          />
        </label>
      </section>

      {diagonal > 0 && (
        <section className="survey-hero" style={{ marginTop: 18 }}>
          <small>Úhlopříčka</small>

          <div
            style={{
              fontSize: 42,
              fontWeight: 800,
              margin: '12px 0'
            }}
          >
            {diagonal.toFixed(3)} m
          </div>

          <p>
            Úhlopříčky A–C i B–D mají mít tuto stejnou délku.
          </p>
        </section>
      )}
    </div>
  )
}
