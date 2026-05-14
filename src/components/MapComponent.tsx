'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const CesiumGlobe = dynamic(() => import('./CesiumGlobe'), { ssr: false });

export default function MapComponent() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [layers, setLayers] = useState({
    earthquakes: true,
    wildfires: true,
    geoBoundary: false,
  });
  const [geoBoundaryLoaded, setGeoBoundaryLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    if (viewMode !== '2d') return;
    if (!mapRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: {
        version: 8,
        name: 'Dark Base Map',
        sources: {
          'basemap-tiles': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
          },
        },
        layers: [
          {
            id: 'basemap-layer',
            type: 'raster',
            source: 'basemap-tiles',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [0, 20],
      zoom: 2,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.on('error', (e) => {
      console.error('Map error:', e.error);
      setMapError(e.error?.message || 'Map rendering error');
    });

    map.on('load', () => {
      setMapLoading(false);
    });

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== '2d') return;
    const map = mapInstance.current;
    if (!map) return;

    const fetchAndAddLayer = async (
      layerType: 'earthquakes' | 'wildfires',
      url: string,
      color: string,
      radius: number
    ) => {
      try {
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Failed to load ${layerType}: HTTP ${response.status}`);
          return;
        }

        const data = await response.json();

        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
          console.error(`Invalid GeoJSON from ${layerType}: missing type or features`);
          return;
        }

        const sourceId = `${layerType}-source`;
        const layerId = `${layerType}-layer`;

        if (map.getSource(sourceId)) {
          (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
        } else {
          map.addSource(sourceId, {
            type: 'geojson',
            data,
          });

          map.addLayer({
            id: layerId,
            type: 'circle',
            source: sourceId,
            paint: {
              'circle-radius': radius,
              'circle-color': color,
              'circle-opacity': 0.8,
            },
          });
        }
      } catch (error) {
        console.error(`Failed to load ${layerType}:`, error);
      }
    };

    if (layers.earthquakes) {
      fetchAndAddLayer(
        'earthquakes',
        '/api/earthquakes?days=7&minMagnitude=2.5',
        '#ff4444',
        6
      );
    } else {
      const sourceId = 'earthquakes-source';
      const layerId = 'earthquakes-layer';
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }

    if (layers.wildfires) {
      fetchAndAddLayer(
        'wildfires',
        '/api/wildfires?days=7&source=VIIRS_S-NPP_NRT',
        '#ff8800',
        4
      );
    } else {
      const sourceId = 'wildfires-source';
      const layerId = 'wildfires-layer';
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    }
  }, [viewMode, layers]);

  useEffect(() => {
    if (viewMode !== '2d') return;
    const map = mapInstance.current;
    if (!map || !layers.geoBoundary) return;

    const sourceId = 'geoboundary-source';
    const lineLayerId = 'geoboundary-line';
    const fillLayerId = 'geoboundary-fill';

    if (geoBoundaryLoaded) return;

    const fetchGeoBoundary = async () => {
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/110m-cultural/ne_110m_admin_0_countries.geojson'
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) return;

        map.addSource(sourceId, {
          type: 'geojson',
          data,
        });

        map.addLayer({
          id: fillLayerId,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': '#3b82f6',
            'fill-opacity': 0.1,
          },
        });

        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#3b82f6',
            'line-width': 1.5,
            'line-opacity': 0.6,
          },
        });

        setGeoBoundaryLoaded(true);
      } catch (error) {
        console.error('Failed to load GeoBoundary:', error);
      }
    };

    fetchGeoBoundary();

    return () => {
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
      setGeoBoundaryLoaded(false);
    };
  }, [viewMode, layers.geoBoundary]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {viewMode === '2d' && (
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      )}
      {viewMode === '3d' && (
        <CesiumGlobe
          earthquakes={layers.earthquakes}
          wildfires={layers.wildfires}
          geoBoundary={layers.geoBoundary}
          centerLon={127.5}
          centerLat={36}
          zoomLevel={4}
        />
      )}
      {viewMode === '2d' && mapLoading && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#fff',
            fontSize: '14px',
            zIndex: 1,
          }}
        >
          Loading map...
        </div>
      )}
      {viewMode === '2d' && mapError && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ff4444',
            fontSize: '14px',
            zIndex: 1,
            textAlign: 'center',
          }}
        >
          <div style={{ marginBottom: '10px' }}>Map Error</div>
          <div>{mapError}</div>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1,
          background: 'rgba(0,0,0,0.7)',
          padding: '10px',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '12px',
        }}
      >
        <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>View Mode</div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
          <button
            onClick={() => setViewMode('2d')}
            style={{
              padding: '4px 10px',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              background: viewMode === '2d' ? '#3b82f6' : 'rgba(255,255,255,0.15)',
              color: '#fff',
            }}
          >
            2D
          </button>
          <button
            onClick={() => setViewMode('3d')}
            style={{
              padding: '4px 10px',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '11px',
              background: viewMode === '3d' ? '#3b82f6' : 'rgba(255,255,255,0.15)',
              color: '#fff',
            }}
          >
            3D Globe
          </button>
        </div>
        <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Layers</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={layers.earthquakes}
            onChange={(e) => setLayers((prev) => ({ ...prev, earthquakes: e.target.checked }))}
          />
          <span style={{ color: '#ff4444' }}>●</span> Earthquakes
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginTop: '5px' }}>
          <input
            type="checkbox"
            checked={layers.wildfires}
            onChange={(e) => setLayers((prev) => ({ ...prev, wildfires: e.target.checked }))}
          />
          <span style={{ color: '#ff8800' }}>●</span> Wildfires
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', marginTop: '5px' }}>
          <input
            type="checkbox"
            checked={layers.geoBoundary}
            onChange={(e) => setLayers((prev) => ({ ...prev, geoBoundary: e.target.checked }))}
          />
          <span style={{ color: '#3b82f6' }}>▬</span> GeoBoundary (Country)
        </label>
      </div>
    </div>
  );
}
