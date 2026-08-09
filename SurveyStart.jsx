import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Survey.css'

export default function SurveyStart() {
  const navigate = useNavigate()
  const activeProject = (() => {
    try {
      return JSON.parse(localStorage.getItem("tm-survey-active-project") || "null")
    } catch {
      return null
    }
  })()
  const [length, setLength] = useState(() => String(activeProject?.length ?? 40))
  const [width, setWidth] = useState(() => String(activeProject?.width ?? 20))

  const diagonal = useMemo(() => {
    const a = Number(length)
    const b = Number(width)

    if (!a || !b) return '—'

    return Math.sqrt(a * a + b * b).toFixed(2)
  }, [length, width])

  return (
    <>
      <div style={{ padding: "16px 20px 0", maxWidth: 900, margin: "0 auto" }}>
        <button
          onClick={() => navigate("/survey/projects")}
          style={{ padding: "10px 14px", marginBottom: 12 }}
        >
          ← Projekty hřišť
        </button>
        {activeProject && (
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Projekt: {activeProject.name}
          </div>
        )}
      </div>
    <div className="survey-page">
      <header className="survey-header">
        <div>
          <button
            onClick={() => navigate('/survey')}
            style={{
              border: 0,
              background: 'white',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 18
            }}
          >
            ←
          </button>

          <h1>Nové vytyčení</h1>
        </div>
      </header>

      <section className="survey-hero">
        <h2>Rozměry hřiště</h2>
        <p>Zadej vnější rozměry obdélníku.</p>

        <div style={{ display: 'grid', gap: 18, marginTop: 24 }}>
          <label>
            <strong>Délka A–B</strong>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                inputMode="decimal"
                value={length}
                onChange={(e) => {
              const value = e.target.value
              setLength(value)
              if (activeProject) {
                const updated = { ...activeProject, length: value, width }
                localStorage.setItem("tm-survey-active-project", JSON.stringify(updated))
                const projects = JSON.parse(localStorage.getItem("tm-survey-projects") || "[]")
                localStorage.setItem("tm-survey-projects", JSON.stringify(projects.map((p) => p.id === updated.id ? updated : p)))
              }
            }}
                style={{
                  width: '100%',
                  fontSize: 26,
                  padding: 16,
                  marginTop: 8,
                  borderRadius: 14,
                  border: '1px solid #d0d5dd'
                }}
              />
              <strong>m</strong>
            </div>
          </label>

          <label>
            <strong>Šířka A–D</strong>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                inputMode="decimal"
                value={width}
                onChange={(e) => {
              const value = e.target.value
              setWidth(value)
              if (activeProject) {
                const updated = { ...activeProject, length, width: value }
                localStorage.setItem("tm-survey-active-project", JSON.stringify(updated))
                const projects = JSON.parse(localStorage.getItem("tm-survey-projects") || "[]")
                localStorage.setItem("tm-survey-projects", JSON.stringify(projects.map((p) => p.id === updated.id ? updated : p)))
              }
            }}
                style={{
                  width: '100%',
                  fontSize: 26,
                  padding: 16,
                  marginTop: 8,
                  borderRadius: 14,
                  border: '1px solid #d0d5dd'
                }}
              />
              <strong>m</strong>
            </div>
          </label>
        </div>
      </section>

      <section className="survey-hero" style={{ marginTop: 18 }}>
        <h2>Kontrolní úhlopříčka</h2>

        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: '#187c3a',
            margin: '12px 0'
          }}
        >
          {diagonal} m
        </div>

        <p>
          U pravoúhlého hřiště musí mít úhlopříčky A–C a B–D stejnou délku.
        </p>
      </section>

      <div className="survey-actions">
        <button
          className="survey-button primary"
          onClick={() =>
            navigate(`/survey/measure?length=${length}&width=${width}`)
          }
        >
          <span className="button-icon">⌖</span>

          <span>
            <strong>Začít vytyčovat</strong>
            <small>Nejdříve založíme bod A</small>
          </span>
        </button>
      </div>
    </div>
    </>
  )
}
