import { describe, expect, it } from 'vitest'
import { compassLabel, distanceMeters, getSunPosition, sunLikelihood } from './sun'

describe('solar model', () => {
  it('puts the sun above NYC at summer noon and below at midnight', () => {
    expect(getSunPosition(new Date('2026-07-30T16:00:00Z'), 40.71, -74).altitude).toBeGreaterThan(60)
    expect(getSunPosition(new Date('2026-07-30T04:00:00Z'), 40.71, -74).altitude).toBeLessThan(0)
  })

  it('scores an open-facing bench higher than an opposing bench', () => {
    const sun = { altitude: 45, azimuth: 180 }
    expect(sunLikelihood('N', sun, 0)).toBeGreaterThan(sunLikelihood('S', sun, 0))
  })

  it('reduces likelihood under heavy cloud', () => {
    const sun = { altitude: 45, azimuth: 180 }
    expect(sunLikelihood('N', sun, 90)).toBeLessThan(sunLikelihood('N', sun, 10))
  })
})

describe('geo helpers', () => {
  it('calculates short distances', () => {
    expect(distanceMeters({ latitude: 40.6895, longitude: -73.9724 }, { latitude: 40.6905, longitude: -73.9724 })).toBeCloseTo(111, -1)
  })

  it('labels compass bearings', () => {
    expect(compassLabel(182)).toBe('south')
  })
})
