// frontend/components/map/IndiaFleetMap.js
'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Truck, Navigation, Activity, Maximize2, ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react';

// // Coordinates for major Indian logistics transport hubs & junction cities
const HUB_COORDINATES = {
  delhi: [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  mumbai: [19.0760, 72.8777],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  kolkata: [22.5726, 88.3639],
  chennai: [13.0827, 80.2707],
  hyderabad: [17.3850, 78.4867],
  ahmedabad: [23.0225, 72.5714],
  jaipur: [26.9124, 75.7873],
  pune: [18.5204, 73.8567],
  nagpur: [21.1458, 79.0882],
  surat: [21.1702, 72.8311],
  vadodara: [22.3072, 73.1812],
  lucknow: [26.8467, 80.9462],
  indore: [22.7196, 75.8577],
  bhopal: [23.2599, 77.4126],
  chandigarh: [30.7333, 76.7794],
  guwahati: [26.1445, 91.7362],
  patna: [25.5941, 85.1376],
  ludhiana: [30.9010, 75.8573],
  visakhapatnam: [17.6868, 83.2185],
  kochi: [9.9312, 76.2673],
  coimbatore: [11.0168, 76.9558],
  kanpur: [26.4499, 80.3319],
  agra: [27.1767, 78.0081],
  gwalior: [26.2183, 78.1828],
  udaipur: [24.5854, 73.7125],
  varanasi: [25.3176, 82.9739],
  raipur: [21.2514, 81.6296],
  ranchi: [23.3441, 85.3096]
};

// Major Indian Highway Corridors Waypoints
const HIGHWAY_CORRIDORS = {
  'delhi-mumbai': [
    [28.6139, 77.2090], // Delhi
    [27.5665, 76.6083], // Alwar
    [26.9124, 75.7873], // Jaipur
    [25.3407, 74.6313], // Bhilwara
    [24.5854, 73.7125], // Udaipur
    [23.0225, 72.5714], // Ahmedabad
    [22.3072, 73.1812], // Vadodara
    [21.1702, 72.8311], // Surat
    [19.0760, 72.8777]  // Mumbai
  ],
  'bengaluru-delhi': [
    [12.9716, 77.5946], // Bengaluru
    [15.8497, 74.4977], // Belagavi
    [17.3850, 78.4867], // Hyderabad
    [21.1458, 79.0882], // Nagpur
    [23.2599, 77.4126], // Bhopal
    [26.2183, 78.1828], // Gwalior
    [27.1767, 78.0081], // Agra
    [28.6139, 77.2090]  // Delhi
  ],
  'delhi-bengaluru': [
    [28.6139, 77.2090], // Delhi
    [27.1767, 78.0081], // Agra
    [26.2183, 78.1828], // Gwalior
    [23.2599, 77.4126], // Bhopal
    [21.1458, 79.0882], // Nagpur
    [17.3850, 78.4867], // Hyderabad
    [15.8497, 74.4977], // Belagavi
    [12.9716, 77.5946]  // Bengaluru
  ],
  'delhi-kolkata': [
    [28.6139, 77.2090], // Delhi
    [27.1767, 78.0081], // Agra
    [26.4499, 80.3319], // Kanpur
    [26.8467, 80.9462], // Lucknow
    [25.3176, 82.9739], // Varanasi
    [25.5941, 85.1376], // Patna
    [22.5726, 88.3639]  // Kolkata
  ],
  'jaipur-bengaluru': [
    [26.9124, 75.7873], // Jaipur
    [24.5854, 73.7125], // Udaipur
    [23.0225, 72.5714], // Ahmedabad
    [21.1702, 72.8311], // Surat
    [19.0760, 72.8777], // Mumbai
    [18.5204, 73.8567], // Pune
    [16.7050, 74.2433], // Kolhapur
    [15.8497, 74.4977], // Belagavi
    [12.9716, 77.5946]  // Bengaluru
  ],
  'nagpur-kolkata': [
    [21.1458, 79.0882], // Nagpur
    [21.2514, 81.6296], // Raipur
    [21.4669, 83.9812], // Sambalpur
    [22.8046, 86.2029], // Jamshedpur
    [22.3149, 87.3005], // Kharagpur
    [22.5726, 88.3639]  // Kolkata
  ],
  'ahmedabad-chennai': [
    [23.0225, 72.5714], // Ahmedabad
    [21.1702, 72.8311], // Surat
    [18.5204, 73.8567], // Pune
    [17.6599, 75.9064], // Solapur
    [17.3850, 78.4867], // Hyderabad
    [14.4426, 79.9865], // Nellore
    [13.0827, 80.2707]  // Chennai
  ]
};

// Corridor active states for highlighting in cyan/blue
const CORRIDOR_ACTIVE_STATES = {
  'delhi-mumbai': ['Delhi', 'Haryana', 'Rajasthan', 'Gujarat', 'Maharashtra'],
  'mumbai-delhi': ['Delhi', 'Haryana', 'Rajasthan', 'Gujarat', 'Maharashtra'],
  'bengaluru-delhi': ['Karnataka', 'Telangana', 'Maharashtra', 'Madhya Pradesh', 'Uttar Pradesh', 'Delhi'],
  'delhi-bengaluru': ['Karnataka', 'Telangana', 'Maharashtra', 'Madhya Pradesh', 'Uttar Pradesh', 'Delhi'],
  'delhi-kolkata': ['Delhi', 'Uttar Pradesh', 'Bihar', 'West Bengal'],
  'kolkata-delhi': ['Delhi', 'Uttar Pradesh', 'Bihar', 'West Bengal'],
  'jaipur-bengaluru': ['Rajasthan', 'Gujarat', 'Maharashtra', 'Karnataka', 'Goa'],
  'nagpur-kolkata': ['Maharashtra', 'Chhattisgarh', 'Odisha', 'Jharkhand', 'West Bengal'],
  'ahmedabad-chennai': ['Gujarat', 'Maharashtra', 'Karnataka', 'Telangana', 'Andhra Pradesh', 'Tamil Nadu']
};

// Map logistics hubs to their respective Indian States
const CITY_STATE_MAP = {
  delhi: 'Delhi',
  'new delhi': 'Delhi',
  mumbai: 'Maharashtra',
  pune: 'Maharashtra',
  nagpur: 'Maharashtra',
  bengaluru: 'Karnataka',
  bangalore: 'Karnataka',
  kolkata: 'West Bengal',
  chennai: 'Tamil Nadu',
  coimbatore: 'Tamil Nadu',
  hyderabad: 'Telangana',
  ahmedabad: 'Gujarat',
  surat: 'Gujarat',
  vadodara: 'Gujarat',
  jaipur: 'Rajasthan',
  udaipur: 'Rajasthan',
  indore: 'Madhya Pradesh',
  bhopal: 'Madhya Pradesh',
  gwalior: 'Madhya Pradesh',
  lucknow: 'Uttar Pradesh',
  kanpur: 'Uttar Pradesh',
  agra: 'Uttar Pradesh',
  varanasi: 'Uttar Pradesh',
  chandigarh: 'Chandigarh',
  ludhiana: 'Punjab',
  guwahati: 'Assam',
  patna: 'Bihar',
  ranchi: 'Jharkhand',
  raipur: 'Chhattisgarh',
  visakhapatnam: 'Andhra Pradesh',
  kochi: 'Kerala'
};

function getCityState(cityName) {
  if (!cityName) return null;
  const normalized = String(cityName).toLowerCase().trim();
  for (const [key, state] of Object.entries(CITY_STATE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return state;
    }
  }
  return null;
}

function getCityCoords(name, defaultCoords = [28.6139, 77.2090]) {
  if (!name) return defaultCoords;
  const normalized = String(name).toLowerCase().trim();
  for (const [key, coords] of Object.entries(HUB_COORDINATES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return coords;
    }
  }
  return defaultCoords;
}

// Helper to compute waypoints, current position, and start/current/next points
function getTripRouteData(trip) {
  const oCity = trip?.originCity || trip?.originBranch?.city || trip?.branchCity || 'Delhi';
  const dCity = trip?.destCity || trip?.destBranch?.city || oCity;
  const isTransit = trip?.isTransit || trip?.status === 'ON_TRIP' || trip?.status === 'IN_TRANSIT' || (trip?.originCity && trip?.destCity && trip?.originCity !== trip?.destCity);
  const isStationary = !isTransit;

  const originCoords = getCityCoords(oCity, HUB_COORDINATES.delhi);
  const destCoords = getCityCoords(dCity, HUB_COORDINATES.mumbai);

  if (isStationary) {
    return {
      isStationary: true,
      originCity: oCity,
      destCity: oCity,
      currentLocation: `${oCity} Depot Hub`,
      originCoords,
      destCoords: originCoords,
      truckCoords: originCoords,
      waypoints: [originCoords],
      traveledPoints: [originCoords],
      remainingPoints: [originCoords],
    };
  }

  const cKey = `${oCity.toLowerCase()}-${dCity.toLowerCase()}`;
  const rKey = `${dCity.toLowerCase()}-${oCity.toLowerCase()}`;

  let waypoints = [];
  if (HIGHWAY_CORRIDORS[cKey]) {
    waypoints = HIGHWAY_CORRIDORS[cKey];
  } else if (HIGHWAY_CORRIDORS[rKey]) {
    waypoints = [...HIGHWAY_CORRIDORS[rKey]].reverse();
  } else {
    // 4-point smooth highway path between origin and destination
    waypoints = [
      originCoords,
      [originCoords[0] + (destCoords[0] - originCoords[0]) * 0.35 + 0.15, originCoords[1] + (destCoords[1] - originCoords[1]) * 0.35 - 0.15],
      [originCoords[0] + (destCoords[0] - originCoords[0]) * 0.70 - 0.15, originCoords[1] + (destCoords[1] - originCoords[1]) * 0.70 + 0.15],
      destCoords
    ];
  }

  const progress = Math.min(0.90, Math.max(0.10, trip?.progress ? trip.progress / 100 : 0.52));
  const totalPoints = waypoints.length;
  const targetIdx = Math.min(totalPoints - 1, Math.floor(progress * (totalPoints - 1)));
  const nextIdx = Math.min(totalPoints - 1, targetIdx + 1);

  const factor = (progress * (totalPoints - 1)) - targetIdx;
  const p1 = waypoints[targetIdx];
  const p2 = waypoints[nextIdx];

  const truckLat = p1[0] + (p2[0] - p1[0]) * factor;
  const truckLng = p1[1] + (p2[1] - p1[1]) * factor;

  const traveledPoints = waypoints.slice(0, targetIdx + 1);
  traveledPoints.push([truckLat, truckLng]);

  const remainingPoints = [[truckLat, truckLng]];
  for (let i = nextIdx; i < waypoints.length; i++) {
    remainingPoints.push(waypoints[i]);
  }

  // Derive human-readable current location along corridor
  const currentLocation = trip?.currentLocation || (
    progress < 0.30 ? `NH Outskirts of ${oCity}` :
    progress < 0.65 ? `National Expressway Corridor` :
    `Approaching ${dCity} Outer Hub`
  );

  return {
    isStationary: false,
    originCity: oCity,
    destCity: dCity,
    currentLocation,
    corridorKey: cKey,
    reverseKey: rKey,
    waypoints,
    originCoords,
    destCoords,
    progress,
    truckCoords: [truckLat, truckLng],
    traveledPoints,
    remainingPoints
  };
}

export default function IndiaFleetMap({
  selectedTrip,
  allTrips = [],
  onSelectTrip,
  activeTripsCount = 0,
  onTimeCount = 0,
  delayedCount = 0,
  isDark = true,
  className = '',
  onOpenModal,
  isModal = false
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geoJsonLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Hover state for vehicle HUD: Only show when hovering over a vehicle
  const [isVehicleHovered, setIsVehicleHovered] = useState(false);
  const [hoveredTrip, setHoveredTrip] = useState(null);

  // Fetch GeoJSON with Indian states boundaries
  useEffect(() => {
    let isMounted = true;
    fetch('/data/india-states-simplified.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch India states GeoJSON');
        return res.json();
      })
      .then((data) => {
        if (isMounted) setGeoJsonData(data);
      })
      .catch((err) => console.error('GeoJSON fetch error:', err));

    return () => { isMounted = false; };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Restrict map bounds to Indian Subcontinent
      const indiaBounds = L.latLngBounds(
        L.latLng(6.0, 68.0),
        L.latLng(37.5, 97.5)
      );

      const map = L.map(mapContainerRef.current, {
        center: [21.8, 80.5],
        zoom: isModal ? 4.8 : 3.9,
        minZoom: 3,
        maxZoom: 14,
        maxBounds: indiaBounds,
        maxBoundsViscosity: 0.65,
        zoomControl: false,
        attributionControl: false,
      });

      // Free Clean Basemap Tiles without watermark or API key (Esri World Gray Canvas)
      const tileUrl = isDark
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

      L.tileLayer(tileUrl, {
        maxZoom: 16,
        attribution: '&copy; OpenStreetMap, Esri',
      }).addTo(map);

      // Create Route & Marker Layer
      const routeLayer = L.layerGroup().addTo(map);
      routeLayerRef.current = routeLayer;
      mapInstanceRef.current = map;

      setMapReady(true);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isDark, isModal]);

  // Recalculate dimensions on modal resize or mount and fit bounds
  useEffect(() => {
    if (mapInstanceRef.current && mapReady) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
        if (!selectedTrip && geoJsonLayerRef.current) {
          const bounds = geoJsonLayerRef.current.getBounds();
          if (bounds.isValid()) {
            mapInstanceRef.current?.fitBounds(bounds, {
              padding: isModal ? [30, 30] : [15, 15],
              maxZoom: isModal ? 5.2 : 4.1,
              animate: false
            });
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [mapReady, isModal, selectedTrip]);

  // Render India States GeoJSON, Selected Route, & All Fleet Vehicle Markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !geoJsonData) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current;

      // Clean up previous GeoJSON layer if any
      if (geoJsonLayerRef.current) {
        map.removeLayer(geoJsonLayerRef.current);
        geoJsonLayerRef.current = null;
      }

      if (routeLayerRef.current) {
        routeLayerRef.current.clearLayers();
      }

      // Determine active states for highlighting:
      // ONLY highlight states if a vehicle is explicitly selected!
      // If NO vehicle is selected or no vehicles exist, do NOT highlight any state.
      let activeStateNames = [];
      if (selectedTrip) {
        const routeData = getTripRouteData(selectedTrip);
        if (routeData.isStationary) {
          const homeState = getCityState(routeData.originCity);
          activeStateNames = homeState ? [homeState] : [];
        } else {
          activeStateNames = CORRIDOR_ACTIVE_STATES[routeData.corridorKey] || CORRIDOR_ACTIVE_STATES[routeData.reverseKey] || [];
          if (activeStateNames.length === 0) {
            const oState = getCityState(routeData.originCity);
            const dState = getCityState(routeData.destCity);
            const fallback = [];
            if (oState) fallback.push(oState);
            if (dState && dState !== oState) fallback.push(dState);
            activeStateNames = fallback;
          }
        }
      } else {
        // No vehicle selected: map remains in clean, neutral standby state
        activeStateNames = [];
      }

      // State Style: Active corridor states highlighted in blue/cyan
      const stateStyle = (feature) => {
        const stateName = feature.properties?.ST_NM || '';
        const isActiveState = activeStateNames.some(s => s.toLowerCase() === stateName.toLowerCase());

        if (isActiveState) {
          return {
            fillColor: isDark ? '#0284C7' : '#38BDF8',
            fillOpacity: isDark ? 0.65 : 0.5,
            color: isDark ? '#00F0FF' : '#0284C7',
            weight: 1.5,
            opacity: 0.9,
          };
        }

        return {
          fillColor: isDark ? '#090F1E' : '#F1F5F9',
          fillOpacity: isDark ? 0.85 : 0.8,
          color: isDark ? '#1E293B' : '#CBD5E1',
          weight: 1,
          opacity: isDark ? 0.65 : 0.9,
        };
      };

      // Add GeoJSON Layer with state hover tooltips
      const geoLayer = L.geoJSON(geoJsonData, {
        style: stateStyle,
        onEachFeature: (feature, layer) => {
          const stateName = feature.properties?.ST_NM || 'State of India';
          
          layer.bindTooltip(`
            <div style="font-family: inherit; font-size: 11px; font-weight: 800; color: ${isDark ? '#FFFFFF' : '#0F172A'}; display: flex; align-items: center; gap: 6px; white-space: nowrap;">
              <span style="display: inline-block; width: 7px; height: 7px; border-radius: 9999px; background: ${isDark ? '#00F0FF' : '#2563EB'}; box-shadow: 0 0 6px ${isDark ? 'rgba(0, 240, 255, 0.8)' : 'rgba(37, 99, 235, 0.45)'};"></span>
              <span style="letter-spacing: 0.01em;">${stateName}</span>
            </div>
          `, {
            sticky: true,
            className: 'custom-state-tooltip',
            direction: 'auto',
            offset: [10, -10]
          });

          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({
                fillColor: isDark ? '#00F0FF' : '#38BDF8',
                fillOpacity: isDark ? 0.75 : 0.6,
                color: isDark ? '#FFFFFF' : '#0284C7',
                weight: 2
              });
            },
            mouseout: (e) => {
              geoLayer.resetStyle(e.target);
            }
          });
        }
      }).addTo(map);

      geoJsonLayerRef.current = geoLayer;

      const routeLayer = routeLayerRef.current;

      // 1. RENDER SELECTED VEHICLE CORRIDOR (START -> CURRENT -> NEXT)
      if (selectedTrip) {
        const routeData = getTripRouteData(selectedTrip);
        const selVehicleId = selectedTrip.vehicleNumber || selectedTrip.vehicle?.vehicle_number || selectedTrip.id || 'FLEET';
        const isStationary = routeData.isStationary;

        if (!isStationary) {
          // Corridor Polyline 1: Remaining Path (Dashed Sky Blue)
          L.polyline(routeData.remainingPoints, {
            color: '#38BDF8',
            weight: 3.5,
            dashArray: '6, 8',
            opacity: 0.85,
          }).addTo(routeLayer);

          // Corridor Polyline 2: Traveled Path (Neon Cyan Solid Glow)
          L.polyline(routeData.traveledPoints, {
            color: '#00F0FF',
            weight: 5,
            opacity: 0.95,
          }).addTo(routeLayer);

          // Point A: START PIN & FADED DEPARTURE TRUCK (Pure Truck without card wrapper)
          const startHtml = `
            <div class="flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto">
              <!-- Faded Departure Truck (Pure truck silhouette without card box) -->
              <div class="relative transition-all duration-200 group-hover:scale-115 group-hover:opacity-90 opacity-45" style="filter: grayscale(35%) drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
                <img src="/images/real-truck-marker.png?v=pure_v1" alt="Start Truck" class="w-9 h-auto object-contain pointer-events-none select-none" style="display:block; width:36px; height:auto; object-fit:contain;" />
                <span class="absolute -top-1 -left-1 px-1 rounded-full text-[8px] font-black leading-none ${isDark ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/50' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'}">A</span>
              </div>
              <!-- Hub Name Badge -->
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${isDark ? 'bg-slate-950/90 border border-emerald-500/40 text-emerald-300' : 'bg-white/95 border border-emerald-300 text-emerald-800 shadow-sm'} text-[11px] font-bold shadow-md whitespace-nowrap">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>${routeData.originCity} Hub</span>
              </div>
            </div>
          `;
          const startIcon = L.divIcon({ html: startHtml, className: 'custom-start-pin bg-transparent border-0', iconSize: [140, 32], iconAnchor: [18, 16] });
          const startMarker = L.marker(routeData.originCoords, { icon: startIcon, zIndexOffset: 850 }).addTo(routeLayer);

          startMarker.bindTooltip(`
            <div class="p-2.5 rounded-xl ${isDark ? 'bg-[#0B1020]/95 border border-emerald-500/50 text-white' : 'bg-white/98 border border-emerald-400 text-slate-900'} shadow-2xl backdrop-blur-md min-w-[170px] pointer-events-none">
              <div class="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Trip Origin (Departed)</span>
              </div>
              <div class="text-xs font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}">${routeData.originCity} Hub</div>
              <div class="text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5 flex items-center gap-1">
                <span>📍 Departure Point</span>
                <span>•</span>
                <span class="text-emerald-400 font-medium">Outward Bound</span>
              </div>
            </div>
          `, {
            direction: 'top',
            offset: [0, -18],
            className: 'custom-truck-tooltip',
            opacity: 1
          });

          // Point B: CURRENT PIN (Active Vibrant Live Real Truck - ONLY Truck shown directly on map, NO card, NO white padding)
          const currentHtml = `
            <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto">
              <!-- Dual soft radar ground aura directly underneath truck tires -->
              <span class="absolute -bottom-1 w-16 h-7 rounded-[100%] ${isDark ? 'bg-cyan-400/25' : 'bg-blue-500/20'} animate-ping pointer-events-none" style="transform: scaleY(0.45);"></span>
              <span class="absolute -bottom-1 w-12 h-5 rounded-[100%] ${isDark ? 'bg-cyan-400/40' : 'bg-blue-600/30'} pointer-events-none" style="transform: scaleY(0.45); filter: blur(4px);"></span>

              <!-- PURE REALISTIC TRUCK ONLY - NO CARD, NO BORDERS, NO WHITE BACKGROUND -->
              <div class="relative transition-all duration-300 group-hover:scale-125" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.6));">
                <img
                  src="/images/real-truck-marker.png?v=pure_v1"
                  alt="Current Live Truck"
                  class="w-14 h-auto object-contain pointer-events-none select-none"
                  style="display: block; width: 56px; height: auto; object-fit: contain;"
                />
                <!-- Subtle live GPS status beacon on cab roof -->
                <span class="absolute top-0 right-0 flex h-2.5 w-2.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-slate-900 shadow-sm"></span>
                </span>
              </div>
            </div>
          `;
          const currentIcon = L.divIcon({ html: currentHtml, className: 'custom-truck-current bg-transparent border-0', iconSize: [56, 42], iconAnchor: [28, 21] });
          const currentMarker = L.marker(routeData.truckCoords, { icon: currentIcon, zIndexOffset: 1200 }).addTo(routeLayer);

          const tripProgressPercent = Math.round((routeData.progress || 0.54) * 100);

          // Rich Tooltip on Hover for Current Live Truck
          currentMarker.bindTooltip(`
            <div class="p-3 rounded-2xl ${isDark ? 'bg-[#0B1020]/95 border-2 border-cyan-400 text-white' : 'bg-white/98 border-2 border-blue-500 text-slate-900'} shadow-2xl backdrop-blur-md min-w-[220px] pointer-events-none">
              <!-- Header with Vehicle Plate & Live Dot -->
              <div class="flex items-center justify-between gap-2 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}">
                <div class="flex items-center gap-1.5 font-mono font-black text-xs ${isDark ? 'text-cyan-300' : 'text-blue-600'} tracking-wider">
                  <span class="text-sm">🚛</span>
                  <span>${selVehicleId}</span>
                </div>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${isDark ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
                  <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  LIVE ON ROAD
                </span>
              </div>

              <!-- Key Telemetry Details -->
              <div class="mt-2 space-y-1.5 text-[11px]">
                <div class="flex items-center justify-between">
                  <span class="${isDark ? 'text-slate-400' : 'text-slate-500'}">Status:</span>
                  <span class="font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}">${selectedTrip?.statusLabel || 'In Transit (Moving)'}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="${isDark ? 'text-slate-400' : 'text-slate-500'}">Current Speed:</span>
                  <span class="font-mono font-bold ${isDark ? 'text-cyan-300' : 'text-blue-600'}">${selectedTrip?.speed || '68 km/h'}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="${isDark ? 'text-slate-400' : 'text-slate-500'}">Location:</span>
                  <span class="font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'} truncate max-w-[130px]">${routeData.currentLocation}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="${isDark ? 'text-slate-400' : 'text-slate-500'}">Corridor Route:</span>
                  <span class="font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}">${routeData.originCity} ➔ ${routeData.destCity}</span>
                </div>

                <!-- Progress Bar -->
                <div class="pt-1.5">
                  <div class="flex items-center justify-between text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1">
                    <span>Route Completed</span>
                    <span class="font-mono font-bold ${isDark ? 'text-cyan-300' : 'text-blue-600'}">${tripProgressPercent}%</span>
                  </div>
                  <div class="w-full h-1.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'} rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 rounded-full" style="width: ${tripProgressPercent}%"></div>
                  </div>
                </div>
              </div>
            </div>
          `, {
            direction: 'top',
            offset: [0, -24],
            className: 'custom-truck-tooltip',
            opacity: 1
          });

          currentMarker.on('mouseover', () => {
            setHoveredTrip(selectedTrip);
            setIsVehicleHovered(true);
          });
          currentMarker.on('mouseout', () => {
            setIsVehicleHovered(false);
          });

          // Point C: NEXT PIN & FADED DESTINATION TRUCK (Pure Truck without card wrapper)
          const nextHtml = `
            <div class="flex items-center gap-1.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto">
              <!-- Hub Name Badge -->
              <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl ${isDark ? 'bg-slate-950/90 border border-rose-500/40 text-rose-300' : 'bg-white/95 border border-rose-300 text-rose-800 shadow-sm'} text-[11px] font-bold shadow-md whitespace-nowrap">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>${routeData.destCity} Hub</span>
              </div>
              <!-- Faded Target Truck (Pure truck silhouette without card box) -->
              <div class="relative transition-all duration-200 group-hover:scale-115 group-hover:opacity-90 opacity-45" style="filter: grayscale(35%) drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
                <img src="/images/real-truck-marker.png?v=pure_v1" alt="Destination Truck" class="w-9 h-auto object-contain pointer-events-none select-none" style="display:block; width:36px; height:auto; object-fit:contain;" />
                <span class="absolute -top-1 -right-1 px-1 rounded-full text-[8px] font-black leading-none ${isDark ? 'bg-rose-950 text-rose-400 border border-rose-500/50' : 'bg-rose-100 text-rose-800 border border-rose-300'}">B</span>
              </div>
            </div>
          `;
          const nextIcon = L.divIcon({ html: nextHtml, className: 'custom-next-pin bg-transparent border-0', iconSize: [140, 32], iconAnchor: [122, 16] });
          const nextMarker = L.marker(routeData.destCoords, { icon: nextIcon, zIndexOffset: 850 }).addTo(routeLayer);

          nextMarker.bindTooltip(`
            <div class="p-2.5 rounded-xl ${isDark ? 'bg-[#0B1020]/95 border border-rose-500/50 text-white' : 'bg-white/98 border border-rose-400 text-slate-900'} shadow-2xl backdrop-blur-md min-w-[170px] pointer-events-none">
              <div class="flex items-center gap-1.5 text-rose-400 font-bold text-[10px] uppercase tracking-wider">
                <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span>Trip Destination (Target)</span>
              </div>
              <div class="text-xs font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}">${routeData.destCity} Hub</div>
              <div class="text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5 flex items-center gap-1">
                <span>🏁 Arrival Endpoint</span>
                <span>•</span>
                <span class="text-rose-400 font-medium">ETA: ${selectedTrip?.eta || 'Today 08:30 PM'}</span>
              </div>
            </div>
          `, {
            direction: 'top',
            offset: [0, -18],
            className: 'custom-truck-tooltip',
            opacity: 1
          });

          // Smoothly fit map to the 3 points (Start, Current, Next)
          map.fitBounds([routeData.originCoords, routeData.truckCoords, routeData.destCoords], {
            padding: isModal ? [50, 50] : [40, 40],
            maxZoom: 7.5,
            animate: true
          });

        } else {
          // Stationary at Yard (Available) - Pure Truck directly on map, NO card
          const yardHtml = `
            <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto">
              <span class="absolute -bottom-1 w-12 h-5 rounded-[100%] ${isDark ? 'bg-blue-400/25' : 'bg-blue-500/20'} animate-pulse pointer-events-none" style="transform: scaleY(0.45); filter: blur(3px);"></span>
              <div class="relative transition-all duration-300 group-hover:scale-120" style="filter: drop-shadow(0 5px 8px rgba(0,0,0,0.5));">
                <img
                  src="/images/real-truck-marker.png?v=pure_v1"
                  alt="Parked Truck"
                  class="w-12 h-auto object-contain pointer-events-none select-none"
                  style="display: block; width: 48px; height: auto; object-fit: contain;"
                />
                <span class="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white dark:border-slate-900 shadow-sm"></span>
              </div>
            </div>
          `;
          const yardIcon = L.divIcon({ html: yardHtml, className: 'custom-yard-pin bg-transparent border-0', iconSize: [48, 36], iconAnchor: [24, 18] });
          const yardMarker = L.marker(routeData.originCoords, { icon: yardIcon, zIndexOffset: 1200 }).addTo(routeLayer);

          yardMarker.bindTooltip(`
            <div class="p-2.5 rounded-xl ${isDark ? 'bg-[#0B1020]/95 border border-blue-400/50 text-white' : 'bg-white/98 border border-blue-400 text-slate-900'} shadow-2xl backdrop-blur-md min-w-[180px] pointer-events-none">
              <div class="flex items-center justify-between gap-2 pb-1.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}">
                <span class="font-mono font-black text-xs ${isDark ? 'text-blue-300' : 'text-blue-600'}">🚛 ${selVehicleId}</span>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">PARKED</span>
              </div>
              <div class="text-[11px] mt-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}">
                <span>Stationed at <b>${routeData.originCity} Hub</b> yard (Ready for dispatch)</span>
              </div>
            </div>
          `, {
            direction: 'top',
            offset: [0, -22],
            className: 'custom-truck-tooltip',
            opacity: 1
          });

          yardMarker.on('mouseover', () => {
            setHoveredTrip(selectedTrip);
            setIsVehicleHovered(true);
          });
          yardMarker.on('mouseout', () => {
            setIsVehicleHovered(false);
          });

          map.flyTo(routeData.originCoords, 7.5, { duration: 1 });
        }
      }

      // 2. PLOT OTHER FLEET VEHICLES AS SUBTLE STANDALONE TRUCKS (No card box, details on hover)
      const fleetToRender = (allTrips || []).filter(t => {
        const vId = t.vehicleNumber || t.vehicle?.vehicle_number || t.id;
        const selId = selectedTrip?.vehicleNumber || selectedTrip?.vehicle?.vehicle_number || selectedTrip?.id;
        return vId !== selId;
      });

      fleetToRender.forEach((veh) => {
        const vData = getTripRouteData(veh);
        const vId = veh.vehicleNumber || veh.vehicle?.vehicle_number || veh.id || 'FLEET';
        const isTransit = !vData.isStationary;

        // Subtle standalone fleet vehicle - pure truck graphic, no card box
        const markerHtml = `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto">
            <div class="transition-all duration-200 group-hover:scale-130 group-hover:opacity-100 opacity-70" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.45));">
              <img
                src="/images/real-truck-marker.png?v=pure_v1"
                alt="Other Fleet Truck"
                class="w-9 h-auto object-contain pointer-events-none select-none"
                style="display: block; width: 36px; height: auto; object-fit: contain;"
              />
            </div>
          </div>
        `;

        const vehicleIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-vehicle-beacon bg-transparent border-0',
          iconSize: [36, 28],
          iconAnchor: [18, 14]
        });

        const marker = L.marker(vData.truckCoords, { icon: vehicleIcon, zIndexOffset: 400 }).addTo(routeLayer);

        marker.bindTooltip(
          `<div class="p-2 rounded-xl ${isDark ? 'bg-[#0B1020]/95 border border-slate-700 text-white' : 'bg-white/98 border border-slate-200 text-slate-900'} shadow-xl backdrop-blur-md min-w-[150px] font-sans pointer-events-none">
             <div class="font-mono font-bold text-xs ${isDark ? 'text-cyan-300' : 'text-blue-600'} flex items-center gap-1">
               <span>🚛</span> ${vId}
             </div>
             <div class="text-[10px] ${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium mt-1">
               ${isTransit ? '● In Transit • ' + (veh.speed || '60 km/h') : '● Stationed at ' + (vData.originCity || 'Yard') + ' Hub'}
             </div>
             <div class="text-[9px] text-cyan-400 mt-1 font-semibold">Click to track this vehicle</div>
           </div>`,
          {
            direction: 'top',
            offset: [0, -14],
            className: 'custom-truck-tooltip',
            opacity: 1
          }
        );

        marker.on('click', () => {
          if (onSelectTrip) onSelectTrip(veh);
        });
      });

      // If no vehicle selected, fit full India bounds cleanly
      if (!selectedTrip && geoLayer) {
        const bounds = geoLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            padding: isModal ? [30, 30] : [15, 15],
            maxZoom: isModal ? 5.2 : 4.1,
            animate: false
          });
        }
      }

    });
  }, [mapReady, geoJsonData, selectedTrip, allTrips, onSelectTrip, isModal, isDark]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleReset = () => {
    if (mapInstanceRef.current && geoJsonLayerRef.current) {
      const bounds = geoJsonLayerRef.current.getBounds();
      if (bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, {
          padding: isModal ? [30, 30] : [15, 15],
          maxZoom: isModal ? 5.2 : 4.1,
          animate: true
        });
      }
    }
  };

  const handleFocusVehicle = () => {
    if (mapInstanceRef.current && selectedTrip) {
      const vData = getTripRouteData(selectedTrip);
      mapInstanceRef.current.flyTo(vData.truckCoords, 8, { duration: 1.2 });
    }
  };

  // Determine active HUD trip info: hovered vehicle takes precedence, fallback to selectedTrip
  const activeHudTrip = hoveredTrip || selectedTrip;
  const hudVehicleId = activeHudTrip?.vehicleNumber || activeHudTrip?.vehicle?.vehicle_number || activeHudTrip?.id || '';
  const hudOriginCity = activeHudTrip?.originCity || activeHudTrip?.originBranch?.city || '';
  const hudDestCity = activeHudTrip?.destCity || activeHudTrip?.destBranch?.city || '';
  const hudRouteText = activeHudTrip?.route || (hudOriginCity && hudDestCity ? `${hudOriginCity} ➔ ${hudDestCity}` : '');
  const hudRemainingText = activeHudTrip?.remaining || '';
  const hudEtaText = activeHudTrip?.eta || '';
  const hudSpeedText = activeHudTrip?.speed || (activeHudTrip ? '60 km/h' : '0 km/h');

  return (
    <div className={`relative rounded-2xl ${isDark ? 'bg-[#070B14] border-slate-800' : 'bg-slate-50 border-slate-200'} border overflow-hidden flex flex-col justify-between ${isModal ? 'h-full min-h-[550px]' : 'min-h-[460px]'} ${className}`}>
      
      {/* Top Header Status Badges & Action Buttons */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-[400] pointer-events-none">
        
        {/* Left Side: Status Counter */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold shadow-xl backdrop-blur-md ${
            isDark ? 'bg-slate-950/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${allTrips && allTrips.length > 0 ? (isDark ? 'bg-cyan-400' : 'bg-blue-600') + ' animate-pulse' : 'bg-slate-400'}`} />
            <span>{activeTripsCount} Active</span>
            <span className={isDark ? 'text-slate-500' : 'text-slate-300'}>•</span>
            <span className="text-emerald-500 dark:text-emerald-400 font-bold">{onTimeCount} On Time</span>
            <span className={isDark ? 'text-slate-500' : 'text-slate-300'}>•</span>
            <span className="text-rose-500 dark:text-rose-400 font-bold">{delayedCount} Delayed</span>
          </div>
        </div>

        {/* Right Side: Modal / Fullscreen Expand Button */}
        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className={`pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-xl backdrop-blur-md text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer ${
              isDark
                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-white border-cyan-400/40'
                : 'bg-white hover:bg-blue-50 text-blue-600 border-blue-200'
            }`}
            title="Open Large Fleet Telemetry Modal"
          >
            <Maximize2 className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
            <span>Expand Radar</span>
          </button>
        )}
      </div>

      {/* Center Empty State Banner: Shown when NO vehicles are present/registered */}
      {(!allTrips || allTrips.length === 0) && (
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] px-5 py-4 rounded-2xl border text-center shadow-2xl backdrop-blur-md pointer-events-none max-w-xs animate-in fade-in duration-200 ${
          isDark ? 'bg-slate-950/90 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
        }`}>
          <div className={`w-10 h-10 mx-auto mb-2.5 rounded-2xl border flex items-center justify-center shadow-inner ${
            isDark ? 'bg-slate-900 border-slate-700/80 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
          }`}>
            <Truck className="w-5 h-5 text-slate-400" />
          </div>
          <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>No Vehicles to Track</div>
          <div className={`text-[11px] mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Register commercial vehicles with GPS to view live highway tracking, radar pulse, and corridor route.
          </div>
        </div>
      )}

      {/* Interactive Leaflet Map DOM Element */}
      <div
        ref={mapContainerRef}
        className={`w-full ${isModal ? 'h-full min-h-[550px]' : 'h-[460px]'} z-0 focus:outline-none`}
        style={{ background: isDark ? '#070B14' : '#F8FAFC' }}
      />

      {/* Bottom Map Floating Telemetry & Controls Toolbar */}
      <div className={`absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] border-t pt-2 z-[400] pointer-events-none ${
        isDark ? 'text-slate-400 border-slate-800/80' : 'text-slate-600 border-slate-200'
      }`}>
        
        {/* Speed / Status Badge */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {selectedTrip ? (
            <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold shadow-lg backdrop-blur-md ${
              isDark ? 'bg-slate-950/95 border-cyan-400/40 text-white' : 'bg-white/95 border-blue-400 text-slate-900 shadow-md'
            }`}>
              <div className="flex items-center gap-1.5 text-emerald-500 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{selectedTrip.originCity || selectedTrip.branchCity || 'Origin'} Hub</span>
              </div>

              <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>➔</span>

              <div className={`flex items-center gap-1.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                <Truck className="w-3.5 h-3.5" />
                <span className="font-mono">{selectedTrip.vehicleNumber || selectedTrip.id}</span>
                <span className={`text-[10px] font-normal truncate hidden md:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  • {selectedTrip.currentLocation || selectedTrip.route || 'Expressway'}
                </span>
              </div>

              <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>➔</span>

              <div className="flex items-center gap-1.5 text-rose-500 shrink-0">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{selectedTrip.destCity || selectedTrip.originCity || 'Destination'} Hub</span>
              </div>

              {selectedTrip.speed && (
                <span className={`ml-1 text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0 ${
                  isDark ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200'
                }`}>
                  {selectedTrip.speed}
                </span>
              )}
            </div>
          ) : (
            <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-medium shadow-md backdrop-blur-sm ${
              isDark ? 'bg-slate-950/90 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-700'
            }`}>
              <span>📡 Click any vehicle from the list to track corridor route</span>
            </div>
          )}
          {selectedTrip && (
            <button
              onClick={handleFocusVehicle}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all shadow-md cursor-pointer shrink-0 ${
                isDark ? 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/40 text-cyan-300' : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600'
              }`}
              title="Focus Vehicle on Map"
            >
              <Navigation className="w-3 h-3" />
              <span>Center</span>
            </button>
          )}
        </div>

        {/* Map Control Buttons: Zoom In, Zoom Out, Fit India Boundaries */}
        <div className="flex items-center space-x-1.5 pointer-events-auto">
          <button
            onClick={handleZoomIn}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shadow-md cursor-pointer ${
              isDark ? 'bg-slate-900/90 border-slate-700 text-white hover:bg-slate-800 hover:border-cyan-400' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-blue-400'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shadow-md cursor-pointer ${
              isDark ? 'bg-slate-900/90 border-slate-700 text-white hover:bg-slate-800 hover:border-cyan-400' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-blue-400'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shadow-md cursor-pointer ${
              isDark ? 'bg-slate-900/90 border-slate-700 text-white hover:bg-slate-800 hover:border-cyan-400' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-blue-400'
            }`}
            title="Fit India Boundaries"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Global CSS for Leaflet State & Popup Customizations */}
      <style jsx global>{`
        .leaflet-container {
          background-color: ${isDark ? '#070B14' : '#F8FAFC'} !important;
          font-family: inherit !important;
        }
        .custom-fleet-popup .leaflet-popup-content-wrapper {
          background: ${isDark ? 'rgba(7, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)'} !important;
          border: 1px solid ${isDark ? '#00F0FF' : '#3B82F6'} !important;
          border-radius: 14px !important;
          padding: 8px 12px !important;
          color: ${isDark ? '#FFFFFF' : '#0F172A'} !important;
          box-shadow: ${isDark
            ? '0 10px 25px -5px rgba(0, 240, 255, 0.25)'
            : '0 10px 25px -5px rgba(37, 99, 235, 0.18)'} !important;
          backdrop-filter: blur(12px) !important;
        }
        .custom-fleet-popup .leaflet-popup-tip {
          background: ${isDark ? 'rgba(7, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)'} !important;
          border: 1px solid ${isDark ? '#00F0FF' : '#3B82F6'} !important;
        }
        .custom-fleet-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: 1.4 !important;
        }
        .custom-state-tooltip {
          background: ${isDark ? 'rgba(7, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)'} !important;
          border: 1px solid ${isDark ? 'rgba(0, 240, 255, 0.45)' : 'rgba(203, 213, 225, 0.95)'} !important;
          border-radius: 10px !important;
          color: ${isDark ? '#FFFFFF' : '#0F172A'} !important;
          padding: 5px 11px !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          letter-spacing: 0.01em !important;
          box-shadow: ${isDark
            ? '0 10px 25px -4px rgba(0, 0, 0, 0.75), 0 0 12px rgba(0, 240, 255, 0.2)'
            : '0 10px 25px -4px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08)'} !important;
          backdrop-filter: blur(10px) !important;
          pointer-events: none !important;
        }
        .custom-state-tooltip.leaflet-tooltip-top:before {
          border-top-color: ${isDark ? 'rgba(7, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)'} !important;
        }
        .custom-state-tooltip.leaflet-tooltip-bottom:before {
          border-bottom-color: ${isDark ? 'rgba(7, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)'} !important;
        }
        .custom-state-tooltip.leaflet-tooltip-left:before {
          border-left-color: ${isDark ? 'rgba(7, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)'} !important;
        }
        .custom-state-tooltip.leaflet-tooltip-right:before {
          border-right-color: ${isDark ? 'rgba(7, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)'} !important;
        }
        .custom-state-tooltip:before {
          border-top-color: ${isDark ? 'rgba(7, 11, 20, 0.95)' : 'rgba(255, 255, 255, 0.98)'} !important;
        }
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .custom-truck-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .custom-truck-tooltip:before {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
