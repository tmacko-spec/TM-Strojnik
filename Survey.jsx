import { useNavigate } from 'react-router-dom'
import './Survey.css'

export default function Survey() {
  const navigate = useNavigate()

  return (
    <div className="survey-page">
      <header className="survey-header">
        <div>
          <div className="survey-brand">TM</div>
          <h1>Vytyčení</h1>
        </div>
        <div className="survey-gps">
          <span className="gps-dot"></span>
          iPhone GPS
        </div>
      </header>

      <section className="survey-hero">
        <div className="court">
          <span className="point p1">A</span>
          <span className="point p2">B</span>
          <span className="point p3">C</span>
          <span className="point p4">D</span>
          <div className="court-line"></div>
        </div>

        <h2>Vytyčení hřiště</h2>
        <p>
          Rychlé vytyčení rohů a pravých úhlů pomocí iPhonu.
        </p>
      </section>

      <section className="survey-actions">
        <button
          className="survey-button primary"
          onClick={() => navigate('/survey/new')}
        >
          <span className="button-icon">＋</span>
          <span>
            <strong>Nové vytyčení</strong>
            <small>Zadat rozměry hřiště</small>
          </span>
        </button>

        <button
          className="survey-button"
          onClick={() => navigate('/survey/project')}
        >
          <span className="button-icon">📄</span>
          <span>
            <strong>Načíst projekt</strong>
            <small>PDF nebo fotografie projektu</small>
          </span>
        </button>

        <button
          className="survey-button"
          onClick={() => navigate('/survey/saved')}
        >
          <span className="button-icon">📍</span>
          <span>
            <strong>Uložené body</strong>
            <small>Obnovit dříve vytyčené body</small>
          </span>
        </button>
      </section>

      <div className="survey-info">
        <strong>V1 • orientační vytyčení</strong>
        <p>
          Přesnost závisí na aktuální kvalitě polohy iPhonu.
          Aplikace nenahrazuje geodetické zaměření.
        </p>
      </div>
    </div>
  )
}
