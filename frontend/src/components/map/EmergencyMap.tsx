import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useEmergency } from '../../context/EmergencyContext';
import {
  Layers,
  Flame,
  Shield,
  Hospital,
  Compass,
  Plus,
  Minus,
  Navigation,
  Activity,
  Building2,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { LiveResource, Station, RouteData } from '../../types';

interface EmergencyMapProps {
  height?: string;
  selectedIncidentId?: string;
  showAllControls?: boolean;
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  height = '500px',
  selectedIncidentId,
  showAllControls = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const stationsLayerRef = useRef<L.LayerGroup | null>(null);
  const resourcesLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const perimeterLayerRef = useRef<L.LayerGroup | null>(null);

  // Cache for smooth resource marker updates
  const resourceMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  const {
    incidents,
    teams,
    hospitals,
    stations,
    liveResources,
    activeRoutes,
    focusLocation,
    returnResourceToStation,
    setActiveIncidentId,
    theme,
  } = useEmergency();

  // Layer Visibility States
  const [showIncidents, setShowIncidents] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [showUnits, setShowUnits] = useState<boolean>(true);
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.625, 77.21],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    const isLight = theme === 'light' || document.documentElement.classList.contains('light');
    const tileUrl = isLight
      ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const tile = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);
    tileLayerRef.current = tile;

    const layerGroup = L.layerGroup().addTo(map);
    const stationsLayer = L.layerGroup().addTo(map);
    const resourcesLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    const perimeterLayer = L.layerGroup().addTo(map);

    layerGroupRef.current = layerGroup;
    stationsLayerRef.current = stationsLayer;
    resourcesLayerRef.current = resourcesLayer;
    routesLayerRef.current = routesLayer;
    perimeterLayerRef.current = perimeterLayer;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      resourceMarkersRef.current.clear();
    };
  }, []);

  // 2. Update Tile Layer on Theme Change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tileUrl =
      theme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const newTile = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTile;
    mapInstanceRef.current.invalidateSize();
  }, [theme]);

  // 3. Handle Fly-to on Focus Location
  useEffect(() => {
    if (!focusLocation || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([focusLocation.lat, focusLocation.lng], 15, {
      duration: 1.2,
    });
  }, [focusLocation]);

  // 4. Update Static Layers (Incidents, Hospitals, Stations)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    const stationsLayer = stationsLayerRef.current;
    const perimeterLayer = perimeterLayerRef.current;

    if (!map || !layerGroup || !stationsLayer || !perimeterLayer) return;

    layerGroup.clearLayers();
    stationsLayer.clearLayers();
    perimeterLayer.clearLayers();

    // Plot Incidents
    if (showIncidents) {
      incidents.forEach((inc) => {
        const isSelected = selectedIncidentId === inc.id;
        const isCritical = inc.severity === 'CRITICAL';

        const markerHtml = `
          <div class="relative group cursor-pointer">
            <div class="absolute -inset-2.5 rounded-full ${
              isCritical ? 'bg-red-500/30 animate-ping' : 'bg-cyan-500/20'
            }"></div>
            <div class="relative w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              isCritical
                ? 'bg-[#180808] border-[#FB4A4A] text-[#FB4A4A] shadow-[0_0_18px_#FB4A4A]'
                : inc.severity === 'HIGH'
                ? 'bg-[#181105] border-[#F5A623] text-[#F5A623] shadow-[0_0_14px_#F5A623]'
                : 'bg-[#061514] border-[#2DD4BF] text-[#2DD4BF] shadow-[0_0_12px_#2DD4BF]'
            } ${isSelected ? 'scale-125 ring-2 ring-white' : ''}">
              <span class="text-[10px] font-bold font-mono">${inc.priority}</span>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 px-1.5 py-0.5 rounded text-[9px] font-mono text-white border border-white/10 pointer-events-none shadow-lg">
              ${inc.id}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: 'custom-emergency-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([inc.location.lat, inc.location.lng], { icon });

        marker.on('click', () => {
          setActiveIncidentId(inc.id);
        });

        marker.bindPopup(`
          <div class="p-3 bg-[#0B0E13] text-[#F5F7FA] rounded-xl border border-white/15 font-sans shadow-2xl min-w-[200px]">
            <div class="text-[10px] font-bold text-[#2DD4BF] font-mono">${inc.id} • ${inc.priority} [${inc.severity}]</div>
            <div class="text-sm font-semibold mt-1">${inc.title}</div>
            <div class="text-xs text-slate-400 mt-1">${inc.location.name}</div>
            <div class="mt-2 pt-2 border-t border-white/10 text-[11px] text-[#2DD4BF] font-mono flex items-center justify-between">
              <span>Status: ${inc.status}</span>
              <span>Conf: ${inc.aiConfidence}%</span>
            </div>
          </div>
        `);

        layerGroup.addLayer(marker);

        if (showHeatmap && isCritical) {
          const circle = L.circle([inc.location.lat, inc.location.lng], {
            radius: 750,
            color: '#FB4A4A',
            fillColor: '#FB4A4A',
            fillOpacity: 0.14,
            weight: 1.5,
            dashArray: '5, 6',
          });
          perimeterLayer.addLayer(circle);
        }
      });
    }

    // Plot Stations (Bases)
    if (showStations) {
      stations.forEach((station) => {
        const lat = station.location?.latitude;
        const lng = station.location?.longitude;
        if (lat === undefined || lng === undefined) return;

        const isFire = station.type === 'FIRE_STATION';
        const isMed = station.type === 'AMBULANCE_BASE';
        const isPol = station.type === 'POLICE_STATION';

        const stationHtml = `
          <div class="relative cursor-pointer group" title="${station.name}">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center border-2 ${
              isFire
                ? 'bg-[#1a0808]/90 border-red-500 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : isMed
                ? 'bg-[#081a12]/90 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : isPol
                ? 'bg-[#08111a]/90 border-blue-500 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)]'
                : 'bg-[#10131a]/90 border-teal-500 text-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.4)]'
            } backdrop-blur-md">
              <span class="text-xs">🏢</span>
            </div>
            <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 px-1 py-0.2 rounded text-[8px] font-mono text-slate-300 border border-white/10 pointer-events-none">
              ${station.stationId}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: stationHtml,
          className: 'custom-station-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([lat, lng], { icon });

        marker.bindPopup(`
          <div class="p-3 bg-[#0B0E13] text-[#F5F7FA] rounded-xl border border-white/15 font-sans shadow-2xl min-w-[220px]">
            <div class="text-[10px] font-bold text-teal-400 font-mono">EMERGENCY BASE / STATION</div>
            <div class="text-sm font-semibold mt-1">${station.name}</div>
            <div class="text-xs text-slate-400 mt-1">${station.address}</div>
            <div class="mt-2 pt-2 border-t border-white/10 text-xs font-mono flex justify-between text-slate-300">
              <span>Capacity: ${station.capacity}</span>
              <span class="text-emerald-400">ACTIVE</span>
            </div>
            <div class="text-[11px] text-slate-400 font-mono mt-1">
              Tel: ${station.contactNumber || '112-STATION'}
            </div>
          </div>
        `);

        stationsLayer.addLayer(marker);
      });
    }

    // Plot Hospitals
    if (showHospitals) {
      hospitals.forEach((hosp) => {
        const hospHtml = `
          <div class="relative cursor-pointer" title="${hosp.name}">
            <div class="w-6 h-6 rounded-md bg-[#120D22]/90 border border-[#7C5CFC] flex items-center justify-center text-[#A78BFA] shadow-[0_0_10px_rgba(124,92,252,0.4)]">
              <span class="text-[10px] font-bold font-mono">H</span>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: hospHtml,
          className: 'custom-hosp-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        const marker = L.marker([hosp.lat, hosp.lng], { icon });

        marker.bindPopup(`
          <div class="p-3 bg-[#0B0E13] text-[#F5F7FA] rounded-xl border border-white/15 font-sans shadow-2xl min-w-[210px]">
            <div class="text-[10px] font-bold text-[#A78BFA] font-mono">TRAUMA MEDICAL FACILITY</div>
            <div class="text-sm font-semibold mt-1">${hosp.name}</div>
            <div class="text-xs text-slate-300 mt-1">Available ICU Beds: ${hosp.availableIcuBeds} / ${hosp.totalBeds}</div>
            <div class="text-xs font-mono mt-2 pt-2 border-t border-white/10 ${
              hosp.divertStatus ? 'text-[#FB4A4A] font-bold' : 'text-[#34D399]'
            }">
              ${hosp.divertStatus ? 'STATUS: DIVERTING PATIENTS' : 'STATUS: ACCEPTING TRAUMA'}
            </div>
          </div>
        `);

        layerGroup.addLayer(marker);
      });
    }
  }, [
    incidents,
    stations,
    hospitals,
    selectedIncidentId,
    showIncidents,
    showStations,
    showHospitals,
    showHeatmap,
    setActiveIncidentId,
  ]);

  // 5. Update Dynamic Resources & Routes
  useEffect(() => {
    const resourcesLayer = resourcesLayerRef.current;
    const routesLayer = routesLayerRef.current;
    if (!resourcesLayer || !routesLayer) return;

    routesLayer.clearLayers();

    // Render Routes
    if (showRoutes) {
      // 1. Render active routes stored in activeRoutes
      Object.entries(activeRoutes).forEach(([key, route]) => {
        if (!route.geometry || route.geometry.length === 0) return;

        // Route geometry is [[longitude, latitude]] -> Leaflet expects [[lat, lng]]
        const latLngs: L.LatLngExpression[] = route.geometry.map(([lng, lat]) => [lat, lng]);

        // Find associated resource to determine if dispatch or return
        const assocResource = liveResources.find((r) => r.resourceId === key);
        const isReturn = assocResource?.status === 'RETURNING';

        const polyline = L.polyline(latLngs, {
          color: isReturn ? '#A855F7' : '#2DD4BF',
          weight: 4,
          opacity: 0.9,
          dashArray: '8, 8',
        });

        polyline.bindPopup(`
          <div class="p-2.5 bg-[#0B0E13] text-[#F5F7FA] rounded-xl border border-white/15 font-mono text-xs shadow-xl">
            <div class="font-bold text-teal-400">${isReturn ? 'RETURN ROUTE' : 'DISPATCH ROUTE'}</div>
            <div class="mt-1">Distance: ${route.distanceKm ? route.distanceKm.toFixed(1) : '?'} km</div>
            <div>ETA: ${route.durationMinutes || '?'} min</div>
          </div>
        `);

        routesLayer.addLayer(polyline);
      });

      // 2. Fallback: Render line between team and assigned incident if no geometric route
      teams.forEach((team) => {
        if (team.assignedIncidentId && team.status === 'EN_ROUTE') {
          const targetInc = incidents.find((i) => i.id === team.assignedIncidentId);
          if (targetInc) {
            const polyline = L.polyline(
              [
                [team.location.lat, team.location.lng],
                [targetInc.location.lat, targetInc.location.lng],
              ],
              {
                color: '#2DD4BF',
                weight: 3,
                opacity: 0.8,
                dashArray: '6, 8',
              }
            );
            routesLayer.addLayer(polyline);
          }
        }
      });
    }

    // Render Resources (Live Units)
    if (showUnits) {
      const currentIds = new Set<string>();

      liveResources.forEach((res) => {
        currentIds.add(res.resourceId);
        const lat = res.currentLocation?.latitude || res.location?.latitude;
        const lng = res.currentLocation?.longitude || res.location?.longitude;
        if (lat === undefined || lng === undefined) return;

        const isEnRoute = res.status === 'EN_ROUTE';
        const isOnScene = res.status === 'ON_SCENE';
        const isReturning = res.status === 'RETURNING';

        const unitEmoji =
          res.type.includes('FIRE') ? '🚒' :
          res.type.includes('AMBULANCE') || res.type.includes('MEDICAL') ? '🚑' :
          res.type.includes('POLICE') ? '🚓' :
          res.type.includes('RESCUE') ? '🛟' : '🚚';

        const markerHtml = `
          <div class="relative cursor-pointer group" title="${res.name}">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center border-2 ${
              isOnScene
                ? 'bg-[#081a12]/95 border-emerald-500 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                : isEnRoute
                ? 'bg-[#1a1308]/95 border-amber-500 text-amber-300 animate-pulse shadow-[0_0_14px_rgba(245,166,35,0.5)]'
                : isReturning
                ? 'bg-[#150a22]/95 border-purple-500 text-purple-300 shadow-[0_0_14px_rgba(168,85,247,0.5)]'
                : 'bg-[#091122]/90 border-teal-500/80 text-teal-300'
            } backdrop-blur-md transition-transform hover:scale-110">
              <span class="text-sm">${unitEmoji}</span>
            </div>
            ${
              isEnRoute && res.etaMinutes !== undefined
                ? `<div class="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-amber-500/90 text-black font-bold px-1.5 py-0.2 rounded text-[9px] font-mono shadow-md">
                    ${res.etaMinutes}m
                  </div>`
                : ''
            }
            <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 px-1 py-0.2 rounded text-[8px] font-mono text-slate-300 border border-white/10 pointer-events-none">
              ${res.resourceId}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: 'custom-resource-marker',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        // Smooth position update if marker already exists
        const existingMarker = resourceMarkersRef.current.get(res.resourceId);
        if (existingMarker) {
          existingMarker.setLatLng([lat, lng]);
          existingMarker.setIcon(icon);
        } else {
          const marker = L.marker([lat, lng], { icon });

          marker.bindPopup(`
            <div class="p-3 bg-[#0B0E13] text-[#F5F7FA] rounded-xl border border-white/15 font-sans shadow-2xl min-w-[220px]">
              <div class="text-[10px] font-bold text-teal-400 font-mono">${res.resourceId} • ${res.status}</div>
              <div class="text-sm font-semibold mt-1">${res.name}</div>
              <div class="text-xs text-slate-400 mt-1">Type: ${res.type}</div>
              ${
                res.etaMinutes !== undefined
                  ? `<div class="mt-2 pt-2 border-t border-white/10 text-xs font-mono text-amber-400">
                      ETA: ${res.etaMinutes} min ${res.distanceKm ? `(${res.distanceKm.toFixed(1)} km)` : ''}
                    </div>`
                  : ''
              }
              ${
                isOnScene
                  ? `<div class="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
                      <span class="text-xs text-emerald-400 font-mono">ON SCENE</span>
                    </div>`
                  : ''
              }
            </div>
          `);

          resourcesLayer.addLayer(marker);
          resourceMarkersRef.current.set(res.resourceId, marker);
        }
      });

      // Remove stale markers
      resourceMarkersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          resourcesLayer.removeLayer(marker);
          resourceMarkersRef.current.delete(id);
        }
      });
    } else {
      resourcesLayer.clearLayers();
      resourceMarkersRef.current.clear();
    }
  }, [liveResources, activeRoutes, teams, incidents, showUnits, showRoutes]);

  // 6. Center on selected incident
  useEffect(() => {
    if (!selectedIncidentId || !mapInstanceRef.current) return;
    const incident = incidents.find((i) => i.id === selectedIncidentId);
    if (incident) {
      mapInstanceRef.current.flyTo([incident.location.lat, incident.location.lng], 14, {
        duration: 1.2,
      });
    }
  }, [selectedIncidentId, incidents]);

  return (
    <div
      className="relative w-full rounded-[20px] overflow-hidden border border-slate-300 dark:border-white/10 bg-[#F4F6F9] dark:bg-[#05070A] shadow-[0_15px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_15px_50px_rgba(0,0,0,0.5)] hud-brackets transition-colors duration-200"
      style={{ height }}
    >
      {/* Actual Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" data-cursor="crosshair" />

      {/* Top Floating Telemetry Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-[#0B0E13]/90 border border-slate-300 dark:border-white/10 backdrop-blur-md flex items-center gap-2 font-mono text-xs shadow-xl">
          <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-[#2DD4BF] animate-pulse" />
          <span className="text-slate-500 dark:text-slate-400">GRID:</span>
          <span className="text-slate-900 dark:text-white font-bold">DELHI-METRO-01</span>
          <span className="text-teal-600 dark:text-[#2DD4BF]">• LIVE GPS</span>
        </div>
      </div>

      {/* Floating Tactical Layer Toggles */}
      {showAllControls && (
        <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/95 dark:bg-[#0B0E13]/90 border border-slate-300 dark:border-white/10 backdrop-blur-md shadow-xl">
          <button
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showIncidents
                ? 'bg-red-500/20 text-red-600 dark:text-[#FB4A4A] border border-red-500/40 font-bold'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Incidents
          </button>

          <button
            onClick={() => setShowStations(!showStations)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showStations
                ? 'bg-teal-500/20 text-teal-700 dark:text-[#2DD4BF] border border-teal-500/40 font-bold'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Stations
          </button>

          <button
            onClick={() => setShowUnits(!showUnits)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showUnits
                ? 'bg-amber-500/20 text-amber-700 dark:text-[#F5A623] border border-amber-500/40 font-bold'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            Units
          </button>

          <button
            onClick={() => setShowHospitals(!showHospitals)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showHospitals
                ? 'bg-purple-500/20 text-purple-700 dark:text-[#A78BFA] border border-purple-500/40 font-bold'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Hospital className="w-3.5 h-3.5" />
            Medical
          </button>

          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showRoutes
                ? 'bg-blue-500/20 text-blue-700 dark:text-[#60A5FA] border border-blue-500/40 font-bold'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Routes
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showHeatmap
                ? 'bg-red-500/20 text-red-600 dark:text-[#FB4A4A] border border-red-500/40 font-bold'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Zones
          </button>
        </div>
      )}

      {/* Floating Zoom & Recenter Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-2 rounded-xl bg-white/95 dark:bg-[#0B0E13]/90 border border-slate-300 dark:border-white/10 text-slate-700 hover:text-slate-950 hover:border-teal-600/50 dark:text-slate-300 dark:hover:text-white dark:hover:border-[#2DD4BF]/50 backdrop-blur-md transition-all shadow-xl"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-2 rounded-xl bg-white/95 dark:bg-[#0B0E13]/90 border border-slate-300 dark:border-white/10 text-slate-700 hover:text-slate-950 hover:border-teal-600/50 dark:text-slate-300 dark:hover:text-white dark:hover:border-[#2DD4BF]/50 backdrop-blur-md transition-all shadow-xl"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.setView([28.625, 77.21], 12)}
          title="Recenter Map"
          className="p-2 rounded-xl bg-white/95 dark:bg-[#0B0E13]/90 border border-slate-300 dark:border-white/10 text-slate-700 hover:text-teal-700 hover:border-teal-600/50 dark:text-slate-300 dark:hover:text-[#2DD4BF] dark:hover:border-[#2DD4BF]/50 backdrop-blur-md transition-all shadow-xl"
          aria-label="Recenter map"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left Legend */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/95 dark:bg-[#0B0E13]/90 border border-slate-300 dark:border-white/10 backdrop-blur-md text-[11px] font-mono text-slate-700 dark:text-slate-400 shadow-xl">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-[#FB4A4A] animate-pulse" /> Critical P1
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-[#2DD4BF]" /> Station Base
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-[#F5A623]" /> En Route Unit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> On Scene
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" /> Returning Unit
        </span>
      </div>
    </div>
  );
};
