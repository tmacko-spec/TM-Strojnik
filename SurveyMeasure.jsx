import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './Survey.css'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

function distanceMeters(a, b) {
  if (!a || !b) return null

  const R = 6371000
  const toRad = (v) => v * Math.PI / 180

  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2

  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function bearingDegrees(from, to) {
  if (!from || !to) return null

  const lat1 = from.latitude * Math.PI / 180
  const lat2 = to.latitude * Math.PI / 180
  const dLon = (to.longitude - from.longitude) * Math.PI / 180

  const y = Math.sin(dLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function formatCoord(value) {
  if (value == null) return '—'
  return Number(value).toFixed(7)
}

export default function SurveyMeasure() {
  const navigate = useNavigate()
  const query = useQuery()

  const length = Number(query.get('length') || 0)
  const width = Number(query.get('width') || 0)

  const diagonal = useMemo(() => {
    if (!length || !width) return 0
    return Math.sqrt(length * length + width * width)
  }, [length, width])

  const [position, setPosition] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [pointA, setPointA] = useState(() => { try { return JSON.parse(localStorage.getItem('tm-survey-point-a')) } catch { return null } })
  const [pointB, setPointB] = useState(() => { try { return JSON.parse(localStorage.getItem('tm-survey-point-b')) } catch { return null } })
  const [restorePoint, setRestorePoint] = useState(null)
  const [deviceHeading, setDeviceHeading] = useState(null)
  const [compassEnabled, setCompassEnabled] = useState(false)

  const restoreDistance = useMemo(
    () => position && restorePoint ? distanceMeters(position, restorePoint) : null,
    [position, restorePoint]
  )

  const restoreBearing = useMemo(
    () => position && restorePoint ? bearingDegrees(position, restorePoint) : null,
    [position, restorePoint]
  )

  const relativeBearing = useMemo(() => {
    if (restoreBearing == null || deviceHeading == null) return restoreBearing
    return (restoreBearing - deviceHeading + 360) % 360
  }, [restoreBearing, deviceHeading])

  const distanceAB = useMemo(
    () => distanceMeters(pointA, pointB),
    [pointA, pointB]
  )

  const differenceAB =
    distanceAB != null && length
      ? length - distanceAB
      : null

  async function enableCompass() {
    try {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        const permission = await DeviceOrientationEvent.requestPermission()
        if (permission !== 'granted') return
      }

      const handler = (event) => {
        let heading = null

        if (typeof event.webkitCompassHeading === 'number') {
          heading = event.webkitCompassHeading
        } else if (typeof event.alpha === 'number') {
          heading = (360 - event.alpha) % 360
        }

        if (heading != null) {
          setDeviceHeading(heading)
          setCompassEnabled(true)
        }
      }

      window.addEventListener('deviceorientation', handler, true)
    } catch (err) {
      console.error('Compass error:', err)
    }
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Tento prohlížeč nepodporuje GPS.')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp
        })
        setGpsError('')
      },
      (err) => {
        setGpsError(err.message || 'Nepodařilo se získat polohu.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  function savePointA() {
    if (!position) return

    const point = {
      ...position,
      savedAt: Date.now()
    }

    setPointA(point)
    localStorage.setItem('tm-survey-point-a', JSON.stringify(point))
  }

  function savePointB() {
    if (!position) return

    const point = {
      ...position,
      savedAt: Date.now()
    }

    setPointB(point)
    localStorage.setItem('tm-survey-point-b', JSON.stringify(point))
  }

  return (
    <div className="survey-page">
      <header className="survey-header">
        <div>
          <button
            onClick={() => navigate('/survey/new')}
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

          <h1>Vytyčování</h1>
        </div>
      </header>

      <section className="survey-hero">
        <h2>Rozměry</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginTop: 16
          }}
        >
          <div>
            <small>Délka</small>
            <strong style={{ display: 'block', fontSize: 22 }}>
              {length || '—'} m
            </strong>
          </div>

          <div>
            <small>Šířka</small>
            <strong style={{ display: 'block', fontSize: 22 }}>
              {width || '—'} m
            </strong>
          </div>

          <div>
            <small>Úhlopříčka</small>
            <strong style={{ display: 'block', fontSize: 22 }}>
              {diagonal ? diagonal.toFixed(2) : '—'} m
            </strong>
          </div>
        </div>
      </section>

      <section className="survey-hero" style={{ marginTop: 18 }}>
        <h2>Poloha iPhonu</h2>

        {gpsError && (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: '#fff2f0',
              color: '#b42318',
              marginTop: 12
            }}
          >
            {gpsError}
          </div>
        )}

        {!gpsError && !position && (
          <p style={{ marginTop: 12 }}>Čekám na GPS…</p>
        )}

        {position && (
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            <div>
              <small>Zeměpisná šířka</small>
              <strong style={{ display: 'block' }}>
                {formatCoord(position.latitude)}
              </strong>
            </div>

            <div>
              <small>Zeměpisná délka</small>
              <strong style={{ display: 'block' }}>
                {formatCoord(position.longitude)}
              </strong>
            </div>

            <div>
              <small>Odhad přesnosti GPS</small>
              <strong
                style={{
                  display: 'block',
                  fontSize: 28,
                  color:
                    position.accuracy <= 5
                      ? '#187c3a'
                      : position.accuracy <= 15
                        ? '#b7791f'
                        : '#b42318'
                }}
              >
                ± {Math.round(position.accuracy)} m
              </strong>
            </div>
          </div>
        )}
      </section>

      <section className="survey-actions">
        <button
          className="survey-button primary"
          onClick={savePointA}
          disabled={!position}
        >
          <span className="button-icon">A</span>
          <span>
            <strong>Uložit bod A</strong>
            <small>Výchozí roh hřiště</small>
          </span>
        </button>

        <button
          className="survey-button"
          onClick={savePointB}
          disabled={!position || !pointA}
        >
          <span className="button-icon">B</span>
          <span>
            <strong>Uložit bod B</strong>
            <small>Určí směr první strany</small>
          </span>
        </button>
      </section>

      {pointA && pointB && distanceAB != null && (
        <section className="survey-hero" style={{ marginTop: 18 }}>
          <h2>Kontrola A–B</h2>

          <div style={{
            fontSize: 42,
            fontWeight: 800,
            color: '#187c3a',
            marginTop: 12
          }}>
            {distanceAB.toFixed(2)} m
          </div>

          <p>
            Požadovaná délka: <strong>{length.toFixed(2)} m</strong>
          </p>

          <div style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 16,
            background: Math.abs(differenceAB) < 0.2
              ? '#eef8f0'
              : '#fff8df',
            fontSize: 20,
            fontWeight: 700
          }}>
            {Math.abs(differenceAB) < 0.2
              ? '✓ Délka je v toleranci'
              : differenceAB > 0
                ? `Ještě ${differenceAB.toFixed(2)} m`
                : `Vrať se o ${Math.abs(differenceAB).toFixed(2)} m`}
          </div>
        </section>
      )}

      <section className="survey-hero" style={{ marginTop: 18 }}>
        <h2>Uložené body</h2>

        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: pointA ? '#eef8f0' : '#f3f4f6'
            }}
          >
            <strong>Bod A</strong>
            <div style={{ marginTop: 6 }}>
              {pointA
                ? `${formatCoord(pointA.latitude)}, ${formatCoord(pointA.longitude)}`
                : 'Neuložen'}
            </div>
          </div>

          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: pointB ? '#eef8f0' : '#f3f4f6'
            }}
          >
            <strong>Bod B</strong>
            <div style={{ marginTop: 6 }}>
              {pointB
                ? `${formatCoord(pointB.latitude)}, ${formatCoord(pointB.longitude)}`
                : 'Neuložen'}
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 10, margin: '16px 0' }}>
      <button
        disabled={!pointA}
        onClick={() => setRestorePoint(pointA)}
        style={{ flex: 1, padding: 14, fontWeight: 700 }}
      >
        Obnovit bod A
      </button>

      <button
        disabled={!pointB}
        onClick={() => setRestorePoint(pointB)}
        style={{ flex: 1, padding: 14, fontWeight: 700 }}
      >
        Obnovit bod B
      </button>
    </div>

    {restorePoint && (
      <div
        style={{
          margin: '0 0 16px',
          padding: 18,
          borderRadius: 16,
          background: '#fff7d6'
        }}
      >
        <strong style={{ fontSize: 18 }}>Obnova uloženého bodu</strong>

        <div
          style={{
            marginTop: 10,
            fontSize: 36,
            fontWeight: 800
          }}
        >
          {restoreDistance !== null
            ? `${restoreDistance.toFixed(2)} m`
            : 'Čekám na GPS…'}
        </div>

        <div style={{ marginTop: 6 }}>
          Vzdálenost k uloženému bodu
        </div>

        {restoreBearing !== null && (
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <div
              style={{
                fontSize: 64,
                lineHeight: 1,
                transform: `rotate(${relativeBearing ?? restoreBearing}deg)`,
                display: 'inline-block'
              }}
            >
              ↑
            </div>

            <div style={{ marginTop: 8, fontWeight: 700 }}>
              Směr k bodu: {restoreBearing.toFixed(0)}°
            </div>

            {!compassEnabled && (
              <button
                onClick={enableCompass}
                style={{
                  marginTop: 12,
                  padding: '10px 16px',
                  fontWeight: 700
                }}
              >
                Zapnout kompas
              </button>
            )}

            {compassEnabled && deviceHeading != null && (
              <div style={{ marginTop: 8, fontSize: 14 }}>
                Kompas: {deviceHeading.toFixed(0)}°
              </div>
            )}
          </div>
        )}

        {position?.accuracy != null && (
          <div style={{ marginTop: 8, fontSize: 14 }}>
            Přesnost GPS: ±{Number(position.accuracy).toFixed(1)} m
          </div>
        )}

        <button
          onClick={() => setRestorePoint(null)}
          style={{
            marginTop: 14,
            width: '100%',
            padding: 12,
            fontWeight: 700
          }}
        >
          Ukončit obnovu bodu
        </button>
      </div>
    )}

    <div className="survey-info">
        <strong>Testovací GPS režim</strong>
        <p>
          Body A a B se ukládají do iPhonu. Přesnost závisí na kvalitě GPS
          signálu a může být v řádu metrů.
        </p>
      </div>
    </div>
  )
}
