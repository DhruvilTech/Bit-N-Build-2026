import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useEmergency } from '../../context/EmergencyContext';
import {
  Layers,
  Flame,
  Ambulance,
  Shield,
  Hospital,
  Compass,
  Plus,
  Minus,
  Navigation,
  Eye,
  Activity,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const perimeterLayerRef = useRef<L.LayerGroup | null>(null);

  const { incidents, teams, hospitals, setActiveIncidentId, theme } = useEmergency();
  const navigate = useNavigate();

  // Layer Visibility States
  const [showIncidents, setShowIncidents] = useState<boolean>(true);
  const [showTeams, setShowTeams] = useState<boolean>(true);
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showRoutes, setShowRoutes] = useState<boolean>(true);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on Metro Central emergency corridor
    const map = L.map(mapContainerRef.current, {
      center: [28.625, 77.21],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    const isLight = document.documentElement.classList.contains('light');
    const tileUrl = isLight
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const tile = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);
    tileLayerRef.current = tile;

    const layerGroup = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    const perimeterLayer = L.layerGroup().addTo(map);

    layerGroupRef.current = layerGroup;
    routesLayerRef.current = routesLayer;
    perimeterLayerRef.current = perimeterLayer;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer on Theme Change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tileUrl = theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const newTile = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTile;
  }, [theme]);

  // Update Layers & Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    const routesLayer = routesLayerRef.current;
    const perimeterLayer = perimeterLayerRef.current;

    if (!map || !layerGroup || !routesLayer || !perimeterLayer) return;

    layerGroup.clearLayers();
    routesLayer.clearLayers();
    perimeterLayer.clearLayers();

    // 1. Plot Incidents
    if (showIncidents) {
      incidents.forEach((inc) => {
        const isSelected = selectedIncidentId === inc.id;
        const isCritical = inc.severity === 'CRITICAL';

        // Custom pulsing HTML marker
        const markerHtml = `
          <div class="relative group cursor-pointer" data-cursor="${isCritical ? 'critical' : 'pointer'}">
            <div class="absolute -inset-2 rounded-full ${
              isCritical ? 'bg-red-500/30 animate-ping' : 'bg-cyan-500/20'
            }"></div>
            <div class="relative w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              isCritical
                ? 'bg-red-950 border-red-500 text-red-400 shadow-[0_0_15px_#EF4444]'
                : inc.severity === 'HIGH'
                ? 'bg-amber-950 border-amber-500 text-amber-400 shadow-[0_0_12px_#F59E0B]'
                : 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-[0_0_10px_#00D9FF]'
            } ${isSelected ? 'scale-125 ring-2 ring-white' : ''}">
              <span class="text-xs font-bold font-mono">${inc.priority}</span>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white border border-white/10 pointer-events-none">
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
          <div class="p-2 bg-[#080B12] text-white rounded font-sans">
            <div class="text-xs font-bold text-cyan-400 font-mono">${inc.id} • ${inc.priority}</div>
            <div class="text-sm font-semibold mt-1">${inc.title}</div>
            <div class="text-xs text-slate-400 mt-1">${inc.location.name}</div>
            <div class="mt-2 text-[11px] text-cyan-300 font-mono">Status: ${inc.status}</div>
          </div>
        `);

        layerGroup.addLayer(marker);

        // Hazard Heatmap / Buffer Zones
        if (showHeatmap && isCritical) {
          const circle = L.circle([inc.location.lat, inc.location.lng], {
            radius: 750, // 750m perimeter
            color: '#EF4444',
            fillColor: '#EF4444',
            fillOpacity: 0.15,
            weight: 1.5,
            dashArray: '4, 6',
          });
          perimeterLayer.addLayer(circle);
        }
      });
    }

    // 2. Plot Teams
    if (showTeams) {
      teams.forEach((team) => {
        const teamIconHtml = `
          <div class="relative cursor-pointer group" title="${team.name}">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center border ${
              team.status === 'AVAILABLE'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400'
                : team.status === 'EN_ROUTE'
                ? 'bg-amber-950/90 border-amber-400 text-amber-300 animate-pulse'
                : 'bg-blue-950/80 border-blue-400 text-blue-300'
            } shadow-lg">
              <span class="text-[10px] font-mono font-bold">${
                team.type === 'Fire' ? 'FT' : team.type === 'Medical' ? 'AM' : 'PD'
              }</span>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: teamIconHtml,
          className: 'custom-team-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([team.location.lat, team.location.lng], { icon });

        marker.bindPopup(`
          <div class="p-2 bg-[#080B12] text-white rounded font-sans">
            <div class="text-xs font-bold text-amber-400 font-mono">${team.id} • ${team.status}</div>
            <div class="text-sm font-semibold mt-1">${team.name}</div>
            <div class="text-xs text-slate-400 mt-1">Vehicle: ${team.vehicleName}</div>
            <div class="text-xs text-cyan-400 mt-1">ETA: ${team.responseTimeEta}m | Fuel: ${team.batteryOrFuelLevel}%</div>
          </div>
        `);

        layerGroup.addLayer(marker);

        // Animated Transit Route connecting team to assigned incident
        if (showRoutes && team.assignedIncidentId && team.status === 'EN_ROUTE') {
          const targetInc = incidents.find((i) => i.id === team.assignedIncidentId);
          if (targetInc) {
            const polyline = L.polyline(
              [
                [team.location.lat, team.location.lng],
                [targetInc.location.lat, targetInc.location.lng],
              ],
              {
                color: '#00D9FF',
                weight: 2.5,
                opacity: 0.85,
                dashArray: '6, 8',
              }
            );
            routesLayer.addLayer(polyline);
          }
        }
      });
    }

    // 3. Plot Hospitals
    if (showHospitals) {
      hospitals.forEach((hosp) => {
        const hospHtml = `
          <div class="relative cursor-pointer" title="${hosp.name}">
            <div class="w-6 h-6 rounded-md bg-purple-950/80 border border-purple-400 flex items-center justify-center text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              <span class="text-[10px] font-bold">H</span>
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
          <div class="p-2 bg-[#080B12] text-white rounded font-sans">
            <div class="text-xs font-bold text-purple-400 font-mono">MEDICAL FACILITY</div>
            <div class="text-sm font-semibold mt-1">${hosp.name}</div>
            <div class="text-xs text-slate-300 mt-1">Available ICU Beds: ${hosp.availableIcuBeds} / ${hosp.totalBeds}</div>
            <div class="text-xs ${hosp.divertStatus ? 'text-red-400 font-bold' : 'text-emerald-400'} mt-1">
              ${hosp.divertStatus ? 'STATUS: DIVERTING PATIENTS' : 'STATUS: ACCEPTING TRAUMA'}
            </div>
          </div>
        `);

        layerGroup.addLayer(marker);
      });
    }
  }, [
    incidents,
    teams,
    hospitals,
    selectedIncidentId,
    showIncidents,
    showTeams,
    showHospitals,
    showHeatmap,
    showRoutes,
    setActiveIncidentId,
  ]);

  // Center on active incident if provided
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
      className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-[#080B12] shadow-sm dark:shadow-2xl"
      style={{ height }}
    >
      {/* Actual Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" data-cursor="crosshair" />

      {/* Top Floating Telemetry Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-xl bg-white/90 dark:bg-[#05070D]/85 border border-slate-200 dark:border-white/10 backdrop-blur-md flex items-center gap-2 font-mono text-xs shadow-sm">
          <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
          <span className="text-slate-500 dark:text-slate-400">GEO-GRID:</span>
          <span className="text-slate-900 dark:text-white font-semibold">DELHI-METRO-01</span>
        </div>
      </div>

      {/* Floating Tactical Layer Toggles */}
      {showAllControls && (
        <div className="absolute top-3 right-3 z-10 flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white/95 dark:bg-[#05070D]/90 border border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm">
          <button
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showIncidents
                ? 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/40 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Incidents
          </button>

          <button
            onClick={() => setShowTeams(!showTeams)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showTeams
                ? 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/40 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Units
          </button>

          <button
            onClick={() => setShowHospitals(!showHospitals)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showHospitals
                ? 'bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/40 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Hospital className="w-3.5 h-3.5" />
            Medical
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showHeatmap
                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Zones
          </button>

          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showRoutes
                ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/40 font-semibold'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Routes
          </button>
        </div>
      )}

      {/* Floating Zoom & Recenter Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-2 rounded-lg bg-white/95 dark:bg-[#05070D]/90 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-cyan-500/50 backdrop-blur-md transition-all shadow-md"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-2 rounded-lg bg-white/95 dark:bg-[#05070D]/90 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-cyan-500/50 backdrop-blur-md transition-all shadow-md"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => mapInstanceRef.current?.setView([28.625, 77.21], 12)}
          title="Recenter Map"
          className="p-2 rounded-lg bg-white/95 dark:bg-[#05070D]/90 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-500/50 backdrop-blur-md transition-all shadow-md"
          aria-label="Recenter map"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Left Legend */}
      <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-white/90 dark:bg-[#05070D]/85 border border-slate-200 dark:border-white/10 backdrop-blur-md text-[11px] font-mono text-slate-600 dark:text-slate-400 shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Critical
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> High
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Responding Team
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Hospital
        </span>
      </div>
    </div>
  );
};
