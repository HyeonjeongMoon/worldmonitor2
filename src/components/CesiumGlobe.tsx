'use client';

import { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';

interface CesiumGlobeProps {
  earthquakes?: boolean;
  wildfires?: boolean;
  geoBoundary?: boolean;
  centerLon?: number;
  centerLat?: number;
  zoomLevel?: number;
}

export default function CesiumGlobe({
  earthquakes = true,
  wildfires = true,
  geoBoundary = false,
  centerLon = 127.5,
  centerLat = 36,
  zoomLevel = 4,
}: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cesiumContainerRef = useRef<Cesium.Viewer | null>(null);
  const [cesiumError, setCesiumError] = useState<string | null>(null);
  const [cesiumLoading, setCesiumLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current || cesiumContainerRef.current) return;

    Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';

    try {
      const viewer = new Cesium.Viewer(containerRef.current, {
        baseLayer: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        animation: false,
        fullscreenButton: false,
        vrButton: false,
        infoBox: false,
        shouldAnimate: true,
      });

      viewer.scene.globe.baseColor = Cesium.Color.BLACK;
      viewer.scene.globe.enableLighting = true;
      viewer.scene.skyAtmosphere = new Cesium.SkyAtmosphere();
      if (viewer.scene.sun) {
        viewer.scene.sun.show = true;
      }
      if (viewer.scene.moon) {
        viewer.scene.moon.show = true;
      }
      viewer.scene.fog.enabled = false;

      viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          maximumLevel: 20,
        })
      );

      cesiumContainerRef.current = viewer;
      setCesiumLoading(false);

      return () => {
        viewer.destroy();
        cesiumContainerRef.current = null;
      };
    } catch (err) {
      console.error('Cesium initialization error:', err);
      setCesiumError(err instanceof Error ? err.message : 'Cesium rendering error');
    }
  }, []);

  useEffect(() => {
    const viewer = cesiumContainerRef.current;
    if (!viewer) return;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, zoomLevel * 500000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0,
      },
      duration: 1.5,
    });
  }, [centerLon, centerLat, zoomLevel]);

  useEffect(() => {
    const viewer = cesiumContainerRef.current;
    if (!viewer) return;

    viewer.entities.removeAll();

    const addEarthquakes = async () => {
      if (!earthquakes) return;
      try {
        const response = await fetch('/api/earthquakes?days=7&minMagnitude=2.5');
        if (!response.ok) return;
        const data = await response.json();
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) return;

        data.features.forEach((feature: any) => {
          const coords = feature.geometry.coordinates;
          const lon = coords[0];
          const lat = coords[1];
          const depth = coords[2] || 0;
          const magnitude = feature.properties.mag || 0;
          const place = feature.properties.place || '';

          const colorMap: Record<string, Cesium.Color> = {
            earthquake_magnitude_2: Cesium.Color.YELLOW,
            earthquake_magnitude_3: Cesium.Color.GREEN,
            earthquake_magnitude_4: Cesium.Color.LIGHTBLUE,
            earthquake_magnitude_5: Cesium.Color.CYAN,
            earthquake_magnitude_6: Cesium.Color.BLUE,
            earthquake_magnitude_7: Cesium.Color.MAGENTA,
            earthquake_magnitude_8: Cesium.Color.RED,
          };

          const magnitudeKey = `earthquake_magnitude_${Math.min(Math.floor(magnitude), 8)}`;
          const circleColor = colorMap[magnitudeKey] || Cesium.Color.YELLOW;

          viewer.entities.add({
            id: `eq-${feature.id}`,
            position: Cesium.Cartesian3.fromDegrees(lon, lat, depth),
            point: {
              pixelSize: Math.max(3, magnitude * 2),
              color: circleColor,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 1,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            label: {
              text: `M${magnitude}`,
              font: '12px sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -15),
              eyeOffset: new Cesium.Cartesian3(0, 0, -150),
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
              backgroundPadding: new Cesium.Cartesian2(4, 2),
            },
            description: `
              <div style="padding:8px;font-family:sans-serif;">
                <h3 style="margin:0 0 5px;color:#ff4444;">Earthquake ${magnitude}</h3>
                <p style="margin:0 0 5px;"><strong>Place:</strong> ${place}</p>
                <p style="margin:0 0 5px;"><strong>Depth:</strong> ${depth.toFixed(1)} km</p>
                <p style="margin:0 0 5px;"><strong>Time:</strong> ${new Date(feature.properties.time).toLocaleString()}</p>
              </div>
            `,
          });
        });
      } catch (err) {
        console.error('Failed to load earthquakes on Cesium globe:', err);
      }
    };

    const addWildfires = async () => {
      if (!wildfires) return;
      try {
        const response = await fetch('/api/wildfires?days=7&source=VIIRS_S-NPP_NRT');
        if (!response.ok) return;
        const data = await response.json();
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) return;

        data.features.forEach((feature: any) => {
          const coords = feature.geometry.coordinates;
          const lon = coords[0];
          const lat = coords[1];

          const frp = feature.properties.FRP || 0;
          const frpIntensity = frp > 0 ? Math.min(frp / 5, 1) : 0.5;

          viewer.entities.add({
            id: `fw-${feature.id}`,
            position: Cesium.Cartesian3.fromDegrees(lon, lat),
            point: {
              pixelSize: Math.max(4, frpIntensity * 8),
              color: Cesium.Color.ORANGE.withAlpha(frpIntensity * 0.8 + 0.2),
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 1,
              heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            },
            label: {
              text: `🔥${frp.toFixed(1)}`,
              font: '11px sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cesium.Cartesian2(0, -15),
              eyeOffset: new Cesium.Cartesian3(0, 0, -150),
              showBackground: true,
              backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
              backgroundPadding: new Cesium.Cartesian2(4, 2),
            },
            description: `
              <div style="padding:8px;font-family:sans-serif;">
                <h3 style="margin:0 0 5px;color:#ff8800;">Wildfire (FRP)</h3>
                <p style="margin:0 0 5px;"><strong>FRP:</strong> ${frp.toFixed(1)} MW</p>
                <p style="margin:0 0 5px;"><strong>Source:</strong> ${feature.properties.source || 'Unknown'}</p>
                <p style="margin:0 0 5px;"><strong>Time:</strong> ${new Date(feature.properties.acq_time).toLocaleString()}</p>
              </div>
            `,
          });
        });
      } catch (err) {
        console.error('Failed to load wildfires on Cesium globe:', err);
      }
    };

    const addGeoBoundary = async () => {
      if (!geoBoundary) return;
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/110m-cultural/ne_110m_admin_0_countries.geojson'
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features)) return;

        data.features.forEach((feature: any) => {
          const coords = feature.geometry.coordinates;

          if (feature.geometry.type === 'Polygon') {
            coords.forEach((polygon: number[][]) => {
              viewer.entities.add({
                id: `gb-poly-${feature.id}`,
                polygon: {
                  hierarchy: Cesium.Cartesian3.fromDegreesArray(polygon.flat()),
                  material: Cesium.Color.BLUE.withAlpha(0.05),
                  outline: true,
                  outlineColor: Cesium.Color.BLUE.withAlpha(0.4),
                  outlineWidth: 1,
                },
              });
            });
          } else if (feature.geometry.type === 'MultiPolygon') {
            coords.forEach((polygon: number[][][]) => {
              polygon.forEach((ring: number[][]) => {
                viewer.entities.add({
                  id: `gb-mpoly-${feature.id}`,
                  polygon: {
                    hierarchy: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
                    material: Cesium.Color.BLUE.withAlpha(0.05),
                    outline: true,
                    outlineColor: Cesium.Color.BLUE.withAlpha(0.4),
                    outlineWidth: 1,
                  },
                });
              });
            });
          } else if (feature.geometry.type === 'LineString') {
            viewer.entities.add({
              id: `gb-line-${feature.id}`,
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArray(coords.flat()),
                width: 1.5,
                material: Cesium.Color.BLUE.withAlpha(0.6),
              },
            });
          } else if (feature.geometry.type === 'MultiLineString') {
            coords.forEach((line: number[][]) => {
              viewer.entities.add({
                id: `gb-mline-${feature.id}`,
                polyline: {
                  positions: Cesium.Cartesian3.fromDegreesArray(line.flat()),
                  width: 1.5,
                  material: Cesium.Color.BLUE.withAlpha(0.6),
                },
              });
            });
          }
        });
      } catch (err) {
        console.error('Failed to load GeoBoundary on Cesium globe:', err);
      }
    };

    addEarthquakes();
    addWildfires();
    addGeoBoundary();

    return () => {
      viewer.entities.removeAll();
    };
  }, [earthquakes, wildfires, geoBoundary]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />
      {cesiumLoading && (
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
          Loading Cesium Globe...
        </div>
      )}
      {cesiumError && (
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
          <div style={{ marginBottom: '10px' }}>Cesium Error</div>
          <div>{cesiumError}</div>
        </div>
      )}
    </div>
  );
}
