import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = searchParams.get('days') || '7';
  const minMagnitude = searchParams.get('minMagnitude') || '2.5';

  try {
    const url = new URL('https://earthquake.usgs.gov/fdsnws/event/1/query');
    url.searchParams.set('format', 'geojson');
    url.searchParams.set('starttime', getStartTime(parseInt(days)));
    url.searchParams.set('endtime', new Date().toISOString().split('T')[0]);
    url.searchParams.set('minmagnitude', minMagnitude);
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
