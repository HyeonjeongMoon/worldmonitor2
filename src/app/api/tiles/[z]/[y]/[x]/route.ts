import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; y: string; x: string }> }
) {
  const { z, y, x } = await params;
  const arcgisUrl = `https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTilesServer/tile/${z}/${y}/${x}.pbf`;

  try {
    const response = await fetch(arcgisUrl);
    if (!response.ok) {
      return new NextResponse('Tile not found', {
        status: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.mapbox-vector-tile',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Tile proxy error:', error);
    return new NextResponse('Proxy error', {
      status: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
