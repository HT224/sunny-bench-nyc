export type SunPosition = { altitude: number; azimuth: number }

const rad = Math.PI / 180
const dayMs = 86_400_000

export function getSunPosition(date: Date, latitude: number, longitude: number): SunPosition {
  const julian = date.getTime() / dayMs + 2440587.5
  const n = julian - 2451545
  const meanLongitude = (280.46 + 0.9856474 * n) % 360
  const meanAnomaly = (357.528 + 0.9856003 * n) % 360
  const eclipticLongitude = (meanLongitude + 1.915 * Math.sin(meanAnomaly * rad) + 0.02 * Math.sin(2 * meanAnomaly * rad)) * rad
  const obliquity = (23.439 - 0.0000004 * n) * rad
  const rightAscension = Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude))
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude))
  const gmst = (280.46061837 + 360.98564736629 * n) % 360
  const hourAngle = ((gmst + longitude) * rad - rightAscension + Math.PI * 3) % (Math.PI * 2) - Math.PI
  const lat = latitude * rad
  const altitude = Math.asin(Math.sin(lat) * Math.sin(declination) + Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle))
  const azimuthSouth = Math.atan2(Math.sin(hourAngle), Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat))
  const azimuth = (azimuthSouth / rad + 180 + 360) % 360
  return { altitude: altitude / rad, azimuth }
}

const outwardBearing: Record<string, number> = { N: 180, S: 0, E: 270, W: 90 }

function angleDifference(a: number, b: number) {
  return Math.abs(((a - b + 540) % 360) - 180)
}

export function sunLikelihood(side: string | undefined, sun: SunPosition, cloudCover = 0) {
  if (sun.altitude <= 0) return 0
  const openDirection = side ? outwardBearing[side] : undefined
  const orientation = openDirection === undefined ? 0.55 : Math.max(0.08, Math.cos(angleDifference(sun.azimuth, openDirection) * rad))
  const altitudeFactor = Math.min(1, Math.max(0.25, sun.altitude / 35))
  const cloudFactor = Math.max(0.18, 1 - cloudCover / 115)
  return Math.round(100 * orientation * altitudeFactor * cloudFactor)
}

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const lat1 = a.latitude * rad
  const lat2 = b.latitude * rad
  const dLat = (b.latitude - a.latitude) * rad
  const dLon = (b.longitude - a.longitude) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function compassLabel(azimuth: number) {
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(azimuth / 45) % 8]
}
