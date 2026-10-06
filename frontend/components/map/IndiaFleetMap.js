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

      // Determine active states for highlighting
      let activeStateNames = [];
      if (selectedTrip) {
        const { corridorKey, reverseKey, originCity } = getTripRouteData(selectedTrip);
        activeStateNames = CORRIDOR_ACTIVE_STATES[corridorKey] || CORRIDOR_ACTIVE_STATES[reverseKey] || [
          'Delhi', 'Haryana', 'Rajasthan', 'Gujarat', 'Maharashtra', 'Karnataka'
        ];
      } else {
        // When showing all vehicles, highlight all major transit states
        activeStateNames = [
          'Delhi', 'Haryana', 'Rajasthan', 'Gujarat', 'Maharashtra',
          'Karnataka', 'Chhattisgarh', 'Odisha', 'West Bengal', 'Tamil Nadu', 'Telangana'
        ];
      }

      // State Style: Active corridor states highlighted in blue/cyan
      const stateStyle = (feature) => {
        const stateName = feature.properties?.ST_NM || '';
        const isActiveState = activeStateNames.some(s => s.toLowerCase() === stateName.toLowerCase());

        if (isActiveState) {
          return {
            fillColor: '#0284C7',     // Solid vibrant cyan/blue
            fillOpacity: 0.65,
            color: '#00F0FF',         // Neon cyan boundary outline
            weight: 1.5,
            opacity: 0.9,
          };
        }

        return {
          fillColor: '#090F1E',       // Sleek dark navy state body
          fillOpacity: 0.85,
          color: '#1E293B',           // State boundary border
          weight: 1,
          opacity: 0.65,
        };
      };

      // Add GeoJSON Layer with state hover tooltips
      const geoLayer = L.geoJSON(geoJsonData, {
        style: stateStyle,
        onEachFeature: (feature, layer) => {
          const stateName = feature.properties?.ST_NM || 'State of India';
          
          layer.bindTooltip(`
            <div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #fff;">
              <span style="color: #00F0FF;">●</span> ${stateName}
            </div>
          `, {
            sticky: true,
            className: 'custom-state-tooltip',
            direction: 'auto'
          });

          layer.on({
            mouseover: (e) => {
              const l = e.target;
              l.setStyle({
                fillColor: '#00F0FF',
                fillOpacity: 0.8,
                color: '#FFFFFF',
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

          // Point A: START PIN (Green Badge with pulse)
          const startHtml = `
            <div class="flex items-center gap-1.5 -translate-x-1/2 -translate-y-full cursor-pointer pointer-events-auto">
              <div class="px-2.5 py-1 rounded-xl bg-slate-950/95 border-2 border-emerald-400 text-white text-[11px] font-bold shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-md"></span>
                <span class="text-emerald-400 uppercase text-[9px] font-black">START:</span>
                <span>${routeData.originCity}</span>
              </div>
            </div>
          `;
          const startIcon = L.divIcon({ html: startHtml, className: 'custom-start-pin', iconSize: [120, 36], iconAnchor: [60, 36] });
          L.marker(routeData.originCoords, { icon: startIcon, zIndexOffset: 850 }).addTo(routeLayer);

          // Point B: CURRENT PIN (Glowing Cyan Truck with Dual Radar Wave Rings)
          const currentHtml = `
            <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
              <!-- Animated dual radar wave rings -->
              <span class="absolute w-14 h-14 rounded-full bg-cyan-400/40 animate-ping pointer-events-none"></span>
              <span class="absolute w-20 h-20 rounded-full bg-cyan-400/20 animate-pulse pointer-events-none"></span>
              
              <!-- Floating CURRENT badge -->
              <div class="mb-1 px-2 py-0.5 rounded-lg bg-slate-950/95 border border-cyan-400 text-cyan-300 text-[10px] font-bold shadow-xl whitespace-nowrap flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                <span>CURRENT: ${selVehicleId}</span>
              </div>

              <!-- Truck Icon Pin -->
              <div class="relative w-10 h-10 rounded-full bg-[#060D1E] border-2 border-cyan-400 text-cyan-300 flex items-center justify-center shadow-2xl shadow-cyan-400/80 transition-transform group-hover:scale-110">
                <svg class="w-5 h-5 text-cyan-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                <span class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border border-slate-900 animate-pulse"></span>
              </div>
            </div>
          `;
          const currentIcon = L.divIcon({ html: currentHtml, className: 'custom-truck-current', iconSize: [140, 70], iconAnchor: [70, 45] });
          const currentMarker = L.marker(routeData.truckCoords, { icon: currentIcon, zIndexOffset: 1200 }).addTo(routeLayer);

          currentMarker.on('mouseover', () => {
            setHoveredTrip(selectedTrip);
            setIsVehicleHovered(true);
          });
          currentMarker.on('mouseout', () => {
            setIsVehicleHovered(false);
          });

          // Point C: NEXT PIN (Rose/Red Destination Pin)
          const nextHtml = `
            <div class="flex items-center gap-1.5 -translate-x-1/2 -translate-y-full cursor-pointer pointer-events-auto">
              <div class="px-2.5 py-1 rounded-xl bg-slate-950/95 border-2 border-rose-500 text-white text-[11px] font-bold shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-md"></span>
                <span class="text-rose-400 uppercase text-[9px] font-black">NEXT:</span>
                <span>${routeData.destCity}</span>
              </div>
            </div>
          `;
          const nextIcon = L.divIcon({ html: nextHtml, className: 'custom-next-pin', iconSize: [120, 36], iconAnchor: [60, 36] });
          L.marker(routeData.destCoords, { icon: nextIcon, zIndexOffset: 850 }).addTo(routeLayer);

          // Smoothly fit map to the 3 points (Start, Current, Next)
          map.fitBounds([routeData.originCoords, routeData.truckCoords, routeData.destCoords], {
            padding: isModal ? [50, 50] : [40, 40],
            maxZoom: 7.5,
            animate: true
          });

        } else {
          // Stationary at Yard (Available)
          const yardHtml = `
            <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
              <span class="absolute w-12 h-12 rounded-full bg-blue-400/30 animate-pulse"></span>
              <div class="mb-1 px-2.5 py-1 rounded-xl bg-slate-950/95 border-2 border-blue-400 text-white text-[11px] font-bold shadow-2xl flex items-center gap-1.5 backdrop-blur-md">
                <span class="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>${selVehicleId} • Stationed at ${routeData.originCity} Hub</span>
              </div>
              <div class="w-10 h-10 rounded-full bg-[#060D1E] border-2 border-blue-400 text-blue-300 flex items-center justify-center shadow-lg">
                <svg class="w-5 h-5 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
            </div>
          `;
          const yardIcon = L.divIcon({ html: yardHtml, className: 'custom-yard-pin', iconSize: [160, 60], iconAnchor: [80, 40] });
          const yardMarker = L.marker(routeData.originCoords, { icon: yardIcon, zIndexOffset: 1200 }).addTo(routeLayer);

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

      // 2. PLOT OTHER FLEET VEHICLES AS CLEAN BADGES ACROSS INDIA
      const fleetToRender = (allTrips || []).filter(t => {
        const vId = t.vehicleNumber || t.vehicle?.vehicle_number || t.id;
        const selId = selectedTrip?.vehicleNumber || selectedTrip?.vehicle?.vehicle_number || selectedTrip?.id;
        return vId !== selId;
      });

      fleetToRender.forEach((veh) => {
        const vData = getTripRouteData(veh);
        const vId = veh.vehicleNumber || veh.vehicle?.vehicle_number || veh.id || 'FLEET';
        const isTransit = !vData.isStationary;
        const statusColor = isTransit ? 'bg-cyan-400' : 'bg-emerald-400';

        const markerHtml = `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group">
            <span class="absolute w-7 h-7 rounded-full ${isTransit ? 'bg-cyan-400/20' : 'bg-emerald-400/20'} animate-ping"></span>
            <div class="relative px-2 py-1 rounded-xl bg-[#060D1E]/95 border ${isTransit ? 'border-cyan-500/60' : 'border-slate-700'} text-white text-[10px] font-bold flex items-center gap-1.5 shadow-xl transition-all group-hover:scale-110 group-hover:border-cyan-300">
              <svg class="w-3 h-3 ${isTransit ? 'text-cyan-300' : 'text-emerald-400'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
              <span class="tracking-tight">${vId}</span>
              <span class="w-1.5 h-1.5 rounded-full ${statusColor}"></span>
            </div>
          </div>
        `;

        const vehicleIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-vehicle-icon-fleet',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker(vData.truckCoords, { icon: vehicleIcon, zIndexOffset: 400 }).addTo(routeLayer);

        marker.on('mouseover', () => {
          setHoveredTrip(veh);
          setIsVehicleHovered(true);
        });
        marker.on('mouseout', () => {
          setIsVehicleHovered(false);
        });
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
  }, [mapReady, geoJsonData, selectedTrip, allTrips, onSelectTrip, isModal]);

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
    <div className={`relative rounded-2xl bg-[#070B14] border border-slate-800 overflow-hidden flex flex-col justify-between ${isModal ? 'h-full min-h-[550px]' : 'min-h-[460px]'} ${className}`}>
      
      {/* Top Header Status Badges & Action Buttons */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2 z-[400] pointer-events-none">
        
        {/* Left Side: Status Counter + Expand Radar at Same Height */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] font-semibold text-white shadow-xl backdrop-blur-md">
            <span className={`w-2 h-2 rounded-full ${allTrips && allTrips.length > 0 ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>{activeTripsCount} Active</span>
            <span className="text-slate-500">•</span>
            <span className="text-emerald-400">{onTimeCount} On Time</span>
            <span className="text-slate-500">•</span>
            <span className="text-rose-400">{delayedCount} Delayed</span>
          </div>

          {/* Modal / Fullscreen Expand Button: Same Height on Left Side */}
          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-white border border-cyan-400/40 shadow-xl backdrop-blur-md text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Open Large Fleet Telemetry Modal"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Expand Radar</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Target Vehicle Telemetry Alert Box: ONLY SHOWS ON HOVER OF VEHICLE */}
      {isVehicleHovered && activeHudTrip && (
        <div
          onMouseEnter={() => setIsVehicleHovered(true)}
          onMouseLeave={() => setIsVehicleHovered(false)}
          className="absolute top-16 left-3.5 z-[400] p-3.5 rounded-2xl bg-slate-950/95 border border-cyan-400 text-white text-xs shadow-2xl backdrop-blur-md min-w-[270px] max-w-[320px] pointer-events-auto transition-all animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between gap-3 font-bold text-cyan-300">
            <div className="flex items-center gap-1.5 truncate">
              <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="truncate text-white text-sm tracking-wide font-mono">{hudVehicleId}</span>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
              activeHudTrip.status === 'DELAYED'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              ● {activeHudTrip.status === 'DELAYED' ? 'Delayed' : 'Live'}
            </span>
          </div>

          <div className="text-[11px] text-slate-300 mt-1.5 font-medium truncate">
            {hudRouteText}
          </div>

          <div className="flex items-center justify-between gap-3 text-[10px] text-emerald-400 font-mono font-semibold mt-2 pt-2 border-t border-slate-800/80">
            <span className="truncate text-cyan-300">{hudRemainingText}</span>
            <span className="shrink-0 text-slate-400 font-normal">
              ETA: <span className="text-emerald-400 font-bold">{hudEtaText}</span>
            </span>
          </div>
        </div>
      )}

      {/* Center Empty State Banner: Shown when NO vehicles are present/registered */}
      {(!allTrips || allTrips.length === 0) && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] px-5 py-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-center shadow-2xl backdrop-blur-md pointer-events-none max-w-xs animate-in fade-in duration-200">
          <div className="w-10 h-10 mx-auto mb-2.5 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-400 shadow-inner">
            <Truck className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-xs font-bold text-white">No Vehicles to Track</div>
          <div className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Register commercial vehicles with GPS to view live highway tracking, radar pulse, and corridor route.
          </div>
        </div>
      )}

      {/* Interactive Leaflet Map DOM Element */}
      <div
        ref={mapContainerRef}
        className={`w-full ${isModal ? 'h-full min-h-[550px]' : 'h-[460px]'} z-0 focus:outline-none`}
        style={{ background: '#070B14' }}
      />

      {/* Bottom Map Floating Telemetry & Controls Toolbar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2 z-[400] pointer-events-none">
        
        {/* Speed / Status Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-400 font-mono shadow-md backdrop-blur-sm">
            {selectedTrip ? (
              <>Corridor Speed: <span className="text-cyan-400 font-bold">{hudSpeedText || '68 km/h'}</span></>
            ) : (
              <>Radar Status: <span className="text-slate-300 font-bold">Standby (No Vehicle Selected)</span></>
            )}
          </div>
          {selectedTrip && (
            <button
              onClick={handleFocusVehicle}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold transition-all shadow-md"
              title="Zoom to Selected Vehicle"
            >
              <Navigation className="w-3 h-3" />
              <span>Center Truck</span>
            </button>
          )}
        </div>

        {/* Map Control Buttons: Zoom In, Zoom Out, Fit India Boundaries */}
        <div className="flex items-center space-x-1.5 pointer-events-auto">
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 rounded-lg bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 hover:border-cyan-400 transition-colors shadow-md cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 rounded-lg bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 hover:border-cyan-400 transition-colors shadow-md cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="w-7 h-7 rounded-lg bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 hover:border-cyan-400 transition-colors shadow-md cursor-pointer"
            title="Fit India Boundaries"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Global CSS for Leaflet State & Popup Customizations */}
      <style jsx global>{`
        .leaflet-container {
          background-color: #070B14 !important;
          font-family: inherit !important;
        }
        .custom-fleet-popup .leaflet-popup-content-wrapper {
          background: rgba(7, 11, 20, 0.95) !important;
          border: 1px solid #00F0FF !important;
          border-radius: 14px !important;
          padding: 8px 12px !important;
          box-shadow: 0 10px 25px -5px rgba(0, 240, 255, 0.25) !important;
          backdrop-filter: blur(12px) !important;
        }
        .custom-fleet-popup .leaflet-popup-tip {
          background: rgba(7, 11, 20, 0.95) !important;
          border: 1px solid #00F0FF !important;
        }
        .custom-fleet-popup .leaflet-popup-content {
          margin: 0 !important;
          line-height: 1.4 !important;
        }
        .custom-state-tooltip {
          background: rgba(7, 11, 20, 0.92) !important;
          border: 1px solid rgba(0, 240, 255, 0.4) !important;
          border-radius: 8px !important;
          color: #fff !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
        }
        .custom-state-tooltip:before {
          border-top-color: rgba(7, 11, 20, 0.92) !important;
        }
      `}</style>
    </div>
  );
}
