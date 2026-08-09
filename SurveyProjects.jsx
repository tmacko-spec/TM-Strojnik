import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SurveyProjects() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [projects, setProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm-survey-projects') || '[]')
    } catch {
      return []
    }
  })

  function addProject() {
    const projectName = name.trim()
    if (!projectName) return

    const project = {
      id: Date.now(),
      name: projectName,
      createdAt: new Date().toISOString()
    }

    const next = [...projects, project]
    setProjects(next)
    localStorage.setItem('tm-survey-projects', JSON.stringify(next))
    setName('')
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1>Projekty hřišť</h1>

      <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Název projektu, např. Hřiště Nová Ves"
          style={{ padding: 14, fontSize: 18 }}
        />

        <button
          onClick={addProject}
          style={{ padding: 14, fontSize: 18, fontWeight: 700 }}
        >
          + Nový projekt
        </button>
      </div>

      {projects.length === 0 ? (
        <p>Zatím není vytvořen žádný projekt.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                localStorage.setItem(
                  'tm-survey-active-project',
                  JSON.stringify(project)
                )
                navigate('/survey/new')
              }}
              style={{
                padding: 18,
                textAlign: 'left',
                fontSize: 18,
                fontWeight: 700
              }}
            >
              🏗️ {project.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
