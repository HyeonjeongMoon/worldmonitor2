import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawDays = searchParams.get('days');
  const source = searchParams.get('source') || 'MODIS_NRT';

  const days = rawDays ? parseInt(rawDays) : 5;

  if (isNaN(days) || days < 1 || days > 30) {
    return NextResponse.json(
      { error: 'days must be between 1 and 30' },
      { status: 400 }
    );
  }

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

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // Skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

function csvToGeoJSON(csv: string) {
  const lines = csv.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  const features: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
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
