
import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('TM-Strojník – chyba aplikace', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="fatal-error">
        <div className="fatal-error-card">
          <span>⚠️</span>
          <h1>Aplikaci se nepodařilo načíst</h1>
          <p>{String(this.state.error?.message || this.state.error)}</p>
          <button onClick={() => location.reload()}>Zkusit znovu</button>
          <button className="secondary" onClick={() => {
            localStorage.removeItem('tm-strojnik-v3-state')
            location.reload()
          }}>Spustit s čistými místními daty</button>
        </div>
      </main>
    )
  }
}
