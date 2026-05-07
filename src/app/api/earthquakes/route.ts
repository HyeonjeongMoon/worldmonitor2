import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawDays = searchParams.get('days');
  const rawMinMagnitude = searchParams.get('minMagnitude');

  const days = rawDays ? parseInt(rawDays) : 7;
  const minMagnitude = rawMinMagnitude ? parseFloat(rawMinMagnitude) : 2.5;

  if (isNaN(days) || days < 1 || days > 365) {
    return NextResponse.json(
      { error: 'days must be between 1 and 365' },
      { status: 400 }
    );
  }

  if (isNaN(minMagnitude) || minMagnitude < 0 || minMagnitude > 10) {
    return NextResponse.json(
      { error: 'minMagnitude must be between 0 and 10' },
      { status: 400 }
    );
  }

  try {
    const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
    url.searchParams.set('format', 'geojson');
    url.searchParams.set('starttime', getStartTime(days));
    url.searchParams.set('endtime', new Date().toISOString().split('T')[0]);
    url.searchParams.set('minmagnitude', minMagnitude.toString());
    url.searchParams.set('orderby', 'time');

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'WorldMonitor/1.0' },
    });

    if (!response.ok) {
      throw new Error(`USGS API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Earthquake API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earthquake data' },
      { status: 500 }
    );
  }
}

function getStartTime(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
