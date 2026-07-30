import { useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { compassLabel, distanceMeters, getSunPosition, sunLikelihood } from './sun'

type Coordinates = { latitude: number; longitude: number }
type BenchRecord = {
  siteid: string
  nearest_add?: string
  on_street?: string
  from_street?: string
  to_street?: string
  side_of_st?: string
  asset_subtype?: string
  ntaname?: string
  latitude: string
  longitude: string
}
const fallbackLocation = { latitude: 40.6895, longitude: -73.9724 }
const fallbackName = 'Fort Greene'

function Recenter({ center }: { center: LatLngExpression }) {
  const map = useMap()
  map.setView(center)
  return null
}

function App() {
  const [screen, setScreen] = useState<'intro' | 'loading' | 'results'>('intro')
  const [coords, setCoords] = useState<Coordinates>(fallbackLocation)
  const [locationName, setLocationName] = useState(fallbackName)
  const [benches, setBenches] = useState<BenchRecord[]>([])
  const [cloudByHour, setCloudByHour] = useState<number[]>([0, 0, 0, 0])
  const [hourOffset, setHourOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState('')

  const targetTime = useMemo(() => new Date(Date.now() + hourOffset * 3_600_000), [hourOffset])
  const sun = useMemo(() => getSunPosition(targetTime, coords.latitude, coords.longitude), [targetTime, coords])
  const ranked = useMemo(() => benches
    .map((bench) => {
      const lat = Number(bench.latitude)
      const lon = Number(bench.longitude)
      return {
        ...bench,
        lat,
        lon,
        distance: distanceMeters(coords, { latitude: lat, longitude: lon }),
        score: sunLikelihood(bench.side_of_st, sun, cloudByHour[hourOffset] ?? cloudByHour[0] ?? 0),
      }
    })
    .filter((bench) => Number.isFinite(bench.lat) && Number.isFinite(bench.lon))
    .sort((a, b) => (b.score * 12 - b.distance / 10) - (a.score * 12 - a.distance / 10))
    .slice(0, 12), [benches, coords, sun, cloudByHour, hourOffset])

  const bestBench = ranked.find((bench) => bench.siteid === selected) ?? ranked[0]

  const startSearch = async () => {
    setScreen('loading')
    setError('')
    let location = fallbackLocation
    let place = fallbackName

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('Location is unavailable'))
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 9000, maximumAge: 120000 })
      })
      location = { latitude: position.coords.latitude, longitude: position.coords.longitude }
      place = 'Near you'
    } catch {
      setError(`Location wasn’t available, so we searched around ${fallbackName}.`)
    }

    setCoords(location)
    setLocationName(place)

    const where = `within_circle(the_geom, ${location.latitude}, ${location.longitude}, 3200)`
    const params = new URLSearchParams({
      '$select': 'siteid,nearest_add,on_street,from_street,to_street,side_of_st,asset_subtype,ntaname,latitude,longitude',
      '$where': where,
      '$limit': '500',
    })

    try {
      const [benchResponse, weatherResponse] = await Promise.all([
        fetch(`https://data.cityofnewyork.us/resource/esmy-s8q5.json?${params}`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&hourly=cloud_cover&forecast_days=1&timezone=America%2FNew_York`),
      ])
      if (!benchResponse.ok) throw new Error('Bench data unavailable')
      const benchData = await benchResponse.json() as BenchRecord[]
      setBenches(benchData)

      if (weatherResponse.ok) {
        const weather = await weatherResponse.json() as { hourly?: { time?: string[]; cloud_cover?: number[] } }
        const times = weather.hourly?.time ?? []
        const clouds = weather.hourly?.cloud_cover ?? []
        setCloudByHour([0, 1, 2, 3].map((offset) => {
          const desired = new Date(Date.now() + offset * 3_600_000)
          const index = times.findIndex((time) => Math.abs(new Date(time).getTime() - desired.getTime()) < 30 * 60 * 1000)
          return index >= 0 ? clouds[index] : clouds[0] ?? 0
        }))
      }
      setScreen('results')
    } catch {
      setError('The city data is taking a sun break. Please try again in a moment.')
      setScreen('intro')
    }
  }

  const labelFor = (score: number) => score >= 68 ? 'Glorious' : score >= 42 ? 'Promising' : score >= 20 ? 'Patchy' : 'Mostly shade'
  const timeLabel = hourOffset === 0 ? 'Now' : targetTime.toLocaleTimeString([], { hour: 'numeric' })
  const distanceLabel = (meters: number) => meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`
  const seatLabel = (type?: string) => type?.includes('BACKED') ? 'Bench with a back' : type?.includes('BACKLESS') ? 'Backless bench' : type?.includes('LEANING') ? 'Leaning bar' : 'Public seat'

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setScreen('intro')} aria-label="Sunny Bench NYC home">
          <span className="brand-sun">☀</span> Sunny Bench <b>NYC</b>
        </button>
        <span className="live-pill"><i /> Live city data</span>
      </header>

      {screen === 'intro' && <section className="hero">
        <div className="sun-orbit" aria-hidden="true"><span>☀</span></div>
        <div className="hero-copy">
          <p className="kicker">A small civic service for photosynthetic New Yorkers</p>
          <h1>Find a bench.<br /><em>Catch some sun.</em></h1>
          <p className="lede">We combine live NYC seating data, the sun’s position and current clouds to find your best nearby place to sit in the light.</p>
          <button className="primary" onClick={() => void startSearch()}>Find me a sunny bench <span>→</span></button>
          {error && <p className="notice" role="status">{error}</p>}
          <p className="permission-note">We’ll ask for your location. Decline and we’ll begin in Fort Greene.</p>
        </div>
        <div className="scene" aria-hidden="true">
          <div className="skyline building-one" /><div className="skyline building-two" /><div className="skyline building-three" />
          <div className="bench-illustration"><span /><span /><i /><i /></div>
          <div className="scene-shadow" />
        </div>
        <p className="tiny">Municipal data. Solar geometry. No guarantee a pigeon hasn’t claimed it first.</p>
      </section>}

      {screen === 'loading' && <section className="loading">
        <div className="loader"><span>☀</span></div>
        <p className="kicker">Reading the sidewalk</p>
        <h2>Following the sun through New York…</h2>
        <p>Checking 3,562 public seats, one suspiciously precise angle at a time.</p>
      </section>}

      {screen === 'results' && <section className="results">
        <div className="results-head">
          <div>
            <p className="kicker">{locationName} · {cloudByHour[hourOffset] ?? 0}% cloud cover</p>
            <h1>Your patch of sun.</h1>
          </div>
          <button className="locate-again" onClick={() => void startSearch()}>↻ Recheck location</button>
        </div>

        <div className="time-picker" aria-label="Forecast time">
          {[0, 1, 2, 3].map((offset) => {
            const time = new Date(Date.now() + offset * 3_600_000)
            return <button key={offset} className={hourOffset === offset ? 'active' : ''} onClick={() => setHourOffset(offset)}>
              <span>{offset === 0 ? 'Now' : `+${offset} hr`}</span>
              <b>{time.toLocaleTimeString([], { hour: 'numeric' })}</b>
            </button>
          })}
        </div>

        {sun.altitude <= 0 ? <div className="night-note">The sun is below the horizon at {timeLabel.toLowerCase()}. Your benches remain excellent, merely nocturnal.</div> : <>
          <div className="map-shell">
            <MapContainer center={[coords.latitude, coords.longitude]} zoom={15} scrollWheelZoom={false} aria-label="Map of nearby benches">
              <Recenter center={[coords.latitude, coords.longitude]} />
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <CircleMarker center={[coords.latitude, coords.longitude]} radius={7} pathOptions={{ color: '#fff', fillColor: '#1f6552', fillOpacity: 1, weight: 3 }}><Popup>You are here</Popup></CircleMarker>
              {ranked.map((bench, index) => <CircleMarker
                key={bench.siteid}
                center={[bench.lat, bench.lon]}
                radius={bestBench?.siteid === bench.siteid ? 13 : 9}
                pathOptions={{ color: '#fff9e9', fillColor: bench.score >= 42 ? '#f4a83b' : '#7b8b6c', fillOpacity: 1, weight: 3 }}
                eventHandlers={{ click: () => setSelected(bench.siteid) }}
              ><Popup><strong>#{index + 1} · {labelFor(bench.score)}</strong><br />{bench.nearest_add ?? bench.on_street}</Popup></CircleMarker>)}
            </MapContainer>
            <div className="map-key"><span><i className="sunny-dot" /> Sunny bet</span><span><i className="shade-dot" /> Shadier bet</span></div>
          </div>

          {bestBench && <article className="best-card">
            <div className="score-ring" style={{ '--score': `${bestBench.score * 3.6}deg` } as React.CSSProperties}>
              <strong>{bestBench.score}%</strong><span>sun bet</span>
            </div>
            <div className="best-copy">
              <p className="kicker">Best bet · {timeLabel}</p>
              <h2>{bestBench.nearest_add ?? bestBench.on_street ?? 'A nearby NYC bench'}</h2>
              <p>{seatLabel(bestBench.asset_subtype)} · {bestBench.ntaname ?? 'New York City'} · {distanceLabel(bestBench.distance)} away</p>
              <div className="bench-tags"><span>☀ {labelFor(bestBench.score)}</span><span>↗ Sun from the {compassLabel(sun.azimuth)}</span>{bestBench.side_of_st && <span>Street side {bestBench.side_of_st}</span>}</div>
            </div>
            <a className="directions" href={`https://www.google.com/maps/dir/?api=1&destination=${bestBench.lat},${bestBench.lon}`} target="_blank" rel="noreferrer">Walk there <span>↗</span></a>
          </article>}

          <div className="bench-list">
            <div className="list-heading"><h2>Other bright ideas</h2><span>{ranked.length} nearby options</span></div>
            {ranked.slice(1, 6).map((bench, index) => <button key={bench.siteid} onClick={() => setSelected(bench.siteid)}>
              <span className="rank">{index + 2}</span>
              <span className="list-address"><b>{bench.nearest_add ?? bench.on_street}</b><small>{seatLabel(bench.asset_subtype)} · {distanceLabel(bench.distance)}</small></span>
              <span className="list-score">{bench.score}%<small>{labelFor(bench.score)}</small></span>
            </button>)}
          </div>
        </>}

        {error && <p className="notice" role="status">{error}</p>}
        <div className="method-note"><b>How this works:</b> We estimate sun likelihood from current solar position, cloud cover and which side of the street each DOT seat occupies. Buildings, trees, awnings and pigeons can intervene. Look up before committing.</div>
      </section>}

      <footer>Made with NYC DOT Open Data and an unreasonable preference for sitting outside.</footer>
    </main>
  )
}

export default App
