import { useEffect, useMemo, useRef, useState } from 'react'
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

  const activeProject = (() => {
    try {
      return JSON.parse(localStorage.getItem("tm-survey-active-project") || "null")
    } catch {
      return null
    }
  })()

  const projectId = activeProject?.id ?? "default"
  const pointAKey = `tm-survey-${projectId}-point-a`
  const pointBKey = `tm-survey-${projectId}-point-b`
  const customPointsKey = `tm-survey-${projectId}-custom-points`

  const length = Number(query.get('length') || 0)
  const width = Number(query.get('width') || 0)

  const diagonal = useMemo(() => {
    if (!length || !width) return 0
    return Math.sqrt(length * length + width * width)
  }, [length, width])

  const [position, setPosition] = useState(null)
  const [arEnabled, setArEnabled] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [cameraSavedMessage, setCameraSavedMessage] = useState("")
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)
  const [gpsError, setGpsError] = useState('')
  const [pointA, setPointA] = useState(() => { try { return JSON.parse(localStorage.getItem(pointAKey)) } catch { return null } })
  const [pointB, setPointB] = useState(() => { try { return JSON.parse(localStorage.getItem(pointBKey)) } catch { return null } })
  const [restorePoint, setRestorePoint] = useState(null)
  const [pointName, setPointName] = useState('')
  const [customPoints, setCustomPoints] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(customPointsKey)) || []
    } catch {
      return []
    }
  })
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

  async function startCamera() {
    try {
      setCameraError("")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false
      })

      cameraStreamRef.current = stream
      setArEnabled(true)
    } catch (err) {
      console.error("Camera error:", err)
      setCameraError("Kameru se nepodařilo spustit. Zkontroluj oprávnění pro kameru.")
      setArEnabled(false)
    }
  }

  function confirmCameraSave(label, saveFn) {
    saveFn()
    setCameraSavedMessage(label)
    setTimeout(() => setCameraSavedMessage(""), 1500)
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setArEnabled(false)
  }

  useEffect(() => {
    if (arEnabled && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [arEnabled])

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

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
    localStorage.setItem(pointAKey, JSON.stringify(point))
  }

  function savePointB() {
    if (!position) return

    const point = {
      ...position,
      savedAt: Date.now()
    }

    setPointB(point)
    localStorage.setItem(pointBKey, JSON.stringify(point))
  }

  function saveCustomPoint() {
    if (!position) return

    const name = pointName.trim() || `Bod ${customPoints.length + 1}`

    const newPoint = {
      id: Date.now(),
      name,
      ...position,
      savedAt: Date.now()
    }

    const next = [...customPoints, newPoint]
    setCustomPoints(next)
    localStorage.setItem(customPointsKey, JSON.stringify(next))
    setPointName('')
  }

  function importCustomPoints(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)

        if (!Array.isArray(data)) {
          throw new Error("Neplatný formát")
        }

        const valid = data.filter(
          (p) =>
            p &&
            typeof p.latitude === "number" &&
            typeof p.longitude === "number"
        )

        if (!valid.length) {
          throw new Error("Soubor neobsahuje žádné platné body")
        }

        setCustomPoints(valid)
        localStorage.setItem(
          "tm-survey-custom-points",
          JSON.stringify(valid)
        )

        window.alert(`Importováno bodů: ${valid.length}`)
      } catch (err) {
        window.alert("Soubor se nepodařilo importovat.")
      }

      event.target.value = ""
    }

    reader.readAsText(file)
  }

  function exportCustomPoints() {
    if (!customPoints.length) return
    const data = JSON.stringify(customPoints, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "TM-body.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  function renameCustomPoint(id) {
    const current = customPoints.find((p) => p.id === id)
    if (!current) return

    const newName = window.prompt('Nový název bodu:', current.name)
    if (newName == null) return

    const trimmed = newName.trim()
    if (!trimmed) return

    const next = customPoints.map((p) =>
      p.id === id ? { ...p, name: trimmed } : p
    )

    setCustomPoints(next)
    localStorage.setItem(customPointsKey, JSON.stringify(next))
  }

  function deleteCustomPoint(id) {
    const current = customPoints.find((p) => p.id === id)
    if (!current) return

    const ok = window.confirm(`Opravdu smazat bod "${current.name}"?`)
    if (!ok) return

    const next = customPoints.filter((p) => p.id !== id)

    setCustomPoints(next)
    localStorage.setItem(customPointsKey, JSON.stringify(next))

    if (restorePoint?.id === id) {
      setRestorePoint(null)
    }
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
          onClick={() => confirmCameraSave("Bod A uložen", savePointA)}
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
          onClick={() => confirmCameraSave("Bod B uložen", savePointB)}
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

      <div style={{ marginBottom: 18 }}>
        <input
          value={pointName}
          onChange={(e) => setPointName(e.target.value)}
          placeholder="Název bodu, např. Roh 1"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: 14,
            borderRadius: 12,
            border: '1px solid #ccc',
            fontSize: 16
          }}
        />

        <button
          onClick={() => confirmCameraSave("Nový bod uložen", saveCustomPoint)}
          disabled={!position}
          style={{
            width: '100%',
            marginTop: 10,
            padding: 14,
            borderRadius: 12,
            fontWeight: 700
          }}
        >
          Uložit nový bod
        </button>
      </div>

      <label
        style={{
          display: "block",
          width: "100%",
          padding: 12,
          marginBottom: 14,
          boxSizing: "border-box",
          textAlign: "center",
          fontWeight: 700,
          background: "#e5e5e5",
          borderRadius: 8
        }}
      >
        Importovat body
        <input
          type="file"
          accept=".json,application/json"
          onChange={importCustomPoints}
          style={{ display: "none" }}
        />
      </label>

      {customPoints.length > 0 && (
        <button
          onClick={exportCustomPoints}
          style={{
            width: "100%",
            padding: 12,
            marginBottom: 14,
            fontWeight: 700
          }}
        >
          Exportovat body
        </button>
      )}

      {customPoints.length > 0 && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
          {customPoints.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 14,
                borderRadius: 14,
                background: '#eef8f0'
              }}
            >
              <strong>{p.name}</strong>

              <div style={{ marginTop: 5 }}>
                {formatCoord(p.latitude)}, {formatCoord(p.longitude)}
              </div>

              <button
                onClick={() => setRestorePoint(p)}
                style={{
                  width: '100%',
                  marginTop: 10,
                  padding: 11,
                  fontWeight: 700
                }}
              >
                Navigovat na bod
              </button>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  marginTop: 8
                }}
              >
                <button
                  onClick={() => renameCustomPoint(p.id)}
                  style={{
                    padding: 10,
                    fontWeight: 700
                  }}
                >
                  Přejmenovat
                </button>

                <button
                  onClick={() => deleteCustomPoint(p.id)}
                  style={{
                    padding: 10,
                    fontWeight: 700
                  }}
                >
                  Smazat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}


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

        {restoreDistance !== null && position?.accuracy != null && (
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              fontWeight: 700,
              background:
                Number(position.accuracy) > 3
                  ? '#ffe8e8'
                  : restoreDistance <= 0.5
                    ? '#dff5e3'
                    : restoreDistance <= 2
                      ? '#fff1c7'
                      : '#eef3f7'
            }}
          >
            {Number(position.accuracy) > 3
              ? `GPS je příliš nepřesná pro přesné určení bodu (±${Number(position.accuracy).toFixed(1)} m)`
              : restoreDistance <= 0.5
                ? 'BOD NALEZEN'
                : restoreDistance <= 2
                  ? 'Blízko bodu'
                  : 'Pokračuj podle šipky'}
          </div>
        )}

        <div style={{ marginTop: 18 }}>
          <button
            onClick={arEnabled ? stopCamera : startCamera}
            style={{
              width: "100%",
              padding: 14,
              fontWeight: 800,
              fontSize: 18,
              borderRadius: 12
            }}
          >
            {arEnabled ? "📷 Vypnout AR kameru" : "📷 AR kamera – najít bod"}
          </button>

          {cameraError && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 10,
                background: "#fee2e2",
                fontWeight: 700
              }}
            >
              {cameraError}
            </div>
          )}

          {arEnabled && (
            <div
              style={{
                position: "relative",
                marginTop: 12,
                height: 420,
                overflow: "hidden",
                borderRadius: 18,
                background: "#111"
              }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover"
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left:
                    relativeBearing == null
                      ? "50%"
                      : `${Math.max(
                          8,
                          Math.min(
                            92,
                            50 +
                              (((relativeBearing + 540) % 360) - 180) *
                                (50 / 45)
                          )
                        )}%`,
                  top: "45%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  transition: "left 0.15s linear",
                  pointerEvents: "none"
                }}
              >
                <div style={{ fontSize: 72, lineHeight: 1 }}>
      {cameraSavedMessage ? (
        <span style={{
          display: "inline-block",
          width: 0,
          height: 0,
          borderTop: "22px solid transparent",
          borderBottom: "22px solid transparent",
          borderLeft: "58px solid #22c55e",
          filter: "drop-shadow(0 2px 3px rgba(0,0,0,.45))"
        }} />
      ) : "🚩"}
    </div>
                <div
                  style={{
                    background: "rgba(0,0,0,.72)",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap"
                  }}
                >
                  Uložený bod
                  <br />
                  {restoredDistance != null
                    ? `${distanceMeters(position, restorePoint).toFixed(2)} m`
                    : ""}
                </div>
              </div>

              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: 28,
                  height: 28,
                  transform: "translate(-50%, -50%)",
                  border: "2px solid white",
                  borderRadius: "50%",
                  boxShadow: "0 0 0 1px rgba(0,0,0,.6)"
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  bottom: 12,
                  background: "rgba(0,0,0,.65)",
                  color: "white",
                  padding: 10,
                  borderRadius: 10,
                  textAlign: "center",
                  fontWeight: 700
                }}
              >
                Otoč zařízení tak, aby byl praporek uprostřed obrazu
              </div>
            </div>
          )}
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

    <div style={{ marginTop: 16, marginBottom: 16 }}>
  <button
    onClick={arEnabled ? stopCamera : startCamera}
    style={{
      width: "100%",
      padding: 18,
      fontSize: 18,
      fontWeight: 800,
      borderRadius: 14,
      border: "none",
      background: arEnabled ? "#6b7280" : "#198c43",
      color: "white"
    }}
  >
    {arEnabled ? "📷 Vypnout AR kameru" : "📷 Zaměřit bod přes kameru"}
  </button>

  {cameraError && (
    <div style={{ marginTop: 10, color: "#b91c1c", fontWeight: 700 }}>
      {cameraError}
    </div>
  )}
</div>

{arEnabled && !restorePoint && (
  <div style={{
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "#111"
  }}>
    <video
      ref={videoRef}
      playsInline
      muted
      autoPlay
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover"
      }}
    />

    <div style={{
      position: "absolute",
      left: "50%",
      top: "45%",
      transform: "translate(-50%, -50%)",
      fontSize: 72,
      pointerEvents: "none"
    }}>🚩</div>

    <div style={{
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 18,
      padding: 12,
      borderRadius: 16,
      background: "rgba(0,0,0,.72)"
    }}>
      <div style={{
        color: "white",
        textAlign: "center",
        fontWeight: 800,
        marginBottom: 10
      }}>
        {cameraSavedMessage || "Zaměř bod středem obrazu"}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <button onClick={() => confirmCameraSave("Bod A uložen", savePointA)} style={{padding:14,fontWeight:800}}>
          Uložit bod A
        </button>
        <button onClick={() => confirmCameraSave("Bod B uložen", savePointB)} style={{padding:14,fontWeight:800}}>
          Uložit bod B
        </button>
      </div>

      <button
        onClick={() => confirmCameraSave("Nový bod uložen", saveCustomPoint)}
        style={{width:"100%",marginTop:8,padding:14,fontWeight:800}}
      >
        📍 Uložit nový bod
      </button>

      <button
        onClick={stopCamera}
        style={{width:"100%",marginTop:8,padding:14,fontWeight:800}}
      >
        Zavřít kameru
      </button>
    </div>
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
