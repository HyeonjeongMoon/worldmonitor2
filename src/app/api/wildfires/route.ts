import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get('days') || '5';
  const source = searchParams.get('source') || 'MODIS_NRT';

  try {
    const url = new URL(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${process.env.NASA_FIRMS_API_KEY}/${source}/world/${days}`);

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'WorldMonitor/1.0' },
    });

    if (!response.ok) {
      throw new Error(`NASA FIRMS API error: ${response.status}`);
    }

    const csvData = await response.text();
    const features = csvToGeoJSON(csvData);

    return NextResponse.json({ type: 'FeatureCollection', features });
  } catch (error) {
    console.error('Wildfires API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wildfire data' },
      { status: 500 }
    );
  }
}

function csvToGeoJSON(csv: string) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  const features: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    if (values.length < 4) continue;

    const lat = parseFloat(values[0]);
    const lon = parseFloat(values[1]);
    const brightness = parseFloat(values[2]);
    const scan = values[3];
    const track = values[4];
    const acqDate = values[5];
    const acqTime = values[6];
    const satellite = values[7];
    const instrument = values[8];
    const confidence = values[9];
    const version = values[10];
    const brightT31 = values[11];
    const frp = values[12];
    const daynight = values[13];

    if (isNaN(lat) || isNaN(lon) || isNaN(brightness)) continue;

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat, 0],
      },
      properties: {
        brightness,
        scan,
        track,
        acqDate,
        acqTime,
        satellite,
        instrument,
        confidence,
        version,
        brightT31,
        frp,
        daynight,
      },
    });
  }

  return features;
}
