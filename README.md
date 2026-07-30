# Sunny Bench NYC

Find a nearby NYC street bench that is likely to be sunny now—or over the next three hours.

**Live app:** https://sunny-bench-nyc.vercel.app

## What it does

- Uses the visitor's location, with Fort Greene as a privacy-friendly fallback.
- Queries the live [NYC DOT Seating Locations dataset](https://data.cityofnewyork.us/resource/esmy-s8q5) for nearby benches and leaning bars.
- Calculates solar altitude and azimuth locally.
- Adds hourly cloud cover from Open-Meteo.
- Ranks seats using the sun's position, cloud cover, distance, and the side of the street where each seat is installed.
- Provides a map, forecast slider, seat details, and walking directions.
- Works as an installable mobile PWA with an offline app shell and resilient data caching.

## Accuracy

The result is deliberately described as a **sun-likelihood estimate**. NYC's seating data does not describe every nearby building, tree, awning, temporary scaffold, or pigeon. The app exposes the factors behind each estimate and tells users to look up before committing.

## Development

```bash
npm install
npm run dev
npm run check
```

`npm run check` runs lint, solar/geo unit tests, TypeScript, and a production build.

## Data

- NYC DOT Seating Locations: `esmy-s8q5` — monthly, 3,562 rows when verified on July 30, 2026.
- Open-Meteo hourly cloud cover.
- OpenStreetMap map tiles.

No API keys are required.
