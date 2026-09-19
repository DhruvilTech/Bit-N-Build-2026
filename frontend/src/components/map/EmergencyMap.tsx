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
} from 'lucide-react';

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

        // Custom pulsing HTML marker with Cyber-Sentinel colors
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
          <div class="p-3 bg-[#0B0E13] text-[#F5F7FA] rounded-xl border border-white/15 font-sans shadow-2xl">
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

        // Hazard Heatmap / Geofenced Buffer Zones
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

    // 2. Plot Teams
    if (showTeams) {
      teams.forEach((team) => {
        const isEnRoute = team.status === 'EN_ROUTE';

        const teamIconHtml = `
          <div class="relative cursor-pointer group" title="${team.name}">
            <div class="w-7 h-7 rounded-lg flex items-center justify-center border ${
              team.status === 'AVAILABLE'
                ? 'bg-[#081812]/90 border-[#34D399] text-[#34D399]'
                : isEnRoute
                ? 'bg-[#181105]/95 border-[#F5A623] text-[#F5A623] animate-pulse shadow-[0_0_12px_#F5A623]'
                : 'bg-[#091122]/90 border-[#3B82F6] text-[#60A5FA]'
            } shadow-lg backdrop-blur-md">
              <span class="text-[9px] font-mono font-bold">${
                team.type === 'Fire' ? 'FT' : team.type === 'Medical' ? 'EMS' : 'PD'
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
          <div class="p-3 bg-[#0B0E13] text-[#F5F7FA] rounded-xl border border-white/15 font-sans shadow-2xl">
            <div class="text-[10px] font-bold text-[#F5A623] font-mono">${team.id} • ${team.status}</div>
            <div class="text-sm font-semibold mt-1">${team.name}</div>
            <div class="text-xs text-slate-400 mt-1">Vehicle: ${team.vehicleName}</div>
            <div class="text-xs text-[#2DD4BF] font-mono mt-2 pt-2 border-t border-white/10 flex justify-between">
              <span>ETA: ${team.responseTimeEta}m</span>
              <span>Fuel: ${team.batteryOrFuelLevel}%</span>
            </div>
          </div>
        `);

        layerGroup.addLayer(marker);

        // Animated Transit Route connecting team to assigned incident
        if (showRoutes && team.assignedIncidentId && isEnRoute) {
          const targetInc = incidents.find((i) => i.id === team.assignedIncidentId);
          if (targetInc) {
            const polyline = L.polyline(
              [
                [team.location.lat, team.location.lng],
                [targetInc.location.lat, targetInc.location.lng],
              ],
              {
                color: '#2DD4BF',
                weight: 2.5,
                opacity: 0.9,
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
          <div class="p-3 bg-[#0B0E13] text-[#F5F7FA] rounded-xl border border-white/15 font-sans shadow-2xl">
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
            onClick={() => setShowTeams(!showTeams)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showTeams
                ? 'bg-teal-500/20 text-teal-700 dark:text-[#2DD4BF] border border-teal-500/40 font-bold'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
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
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all ${
              showHeatmap
                ? 'bg-amber-500/20 text-amber-700 dark:text-[#F5A623] border border-amber-500/40 font-bold'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Zones
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
          <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-[#F5A623]" /> Warning/Delay
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-[#2DD4BF]" /> Responding Unit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-[#7C5CFC]" /> Trauma Hospital
        </span>
      </div>
    </div>
  );
};
