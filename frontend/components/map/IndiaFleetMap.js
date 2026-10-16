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

// India geographic bounding box covering Kashmir to Kanyakumari and Gujarat to Arunachal Pradesh
const INDIA_BOUNDS = [
  [6.8, 68.0],   // Southwest coordinates (below Kanyakumari, west of Gujarat)
  [36.0, 97.5]   // Northeast coordinates (above Kashmir, east of Arunachal)
];

// Helper to compute waypoints, current position, and start/current/next points
function getTripRouteData(trip) {
  const realLat = parseFloat(trip?.latitude || trip?.last_latitude || trip?.vehicle?.last_latitude);
  const realLng = parseFloat(trip?.longitude || trip?.last_longitude || trip?.vehicle?.last_longitude);
  const hasRealGps = !isNaN(realLat) && !isNaN(realLng) && realLat > 0 && realLng > 0;
  const headingAngle = parseFloat(trip?.angle ?? trip?.last_heading ?? trip?.vehicle?.last_heading ?? 0) || 0;
  const liveSpeed = parseFloat(trip?.speed ?? trip?.last_speed ?? 0) || 0;
  const liveIgnition = trip?.ignition !== undefined
    ? Boolean(trip.ignition)
    : (trip?.last_ignition !== undefined ? Boolean(trip.last_ignition) : (liveSpeed > 0));

  const locName = trip?.last_location_name || trip?.currentLocation || trip?.location || (hasRealGps ? 'Live Telematics' : 'Yard Depot');
  const oCity = trip?.originCity || trip?.origin_city || trip?.originBranch?.city || trip?.origin || trip?.branchCity || (hasRealGps ? locName : 'Delhi');
  const dCity = trip?.destCity || trip?.destination_city || trip?.destBranch?.city || trip?.destination || oCity;

  // A vehicle is in an active transit corridor if flagged active/in transit AND has distinct origin and destination
  const isTransitStatus = Boolean(
    trip?.isTransit ||
    trip?.hasActiveTrip ||
    ['IN_TRANSIT', 'RUNNING', 'ON_TRIP', 'READY', 'DISPATCHED', 'LOADED'].includes(trip?.status)
  );

  const hasDistinctCities = Boolean(
    oCity && dCity && oCity.toLowerCase().trim() !== dCity.toLowerCase().trim()
  );

  const hasValidCorridor = isTransitStatus && hasDistinctCities;
  const isStationary = !hasValidCorridor;

  if (hasRealGps) {
    // Exact GPS coordinates from WheelsEye telemetry hardware
    const truckCoords = [realLat, realLng];

    if (isStationary) {
      return {
        isStationary: true,
        hasRealGps: true,
        originCity: oCity,
        destCity: oCity,
        currentLocation: locName,
        corridorKey: `${oCity.toLowerCase()}-${oCity.toLowerCase()}`,
        reverseKey: `${oCity.toLowerCase()}-${oCity.toLowerCase()}`,
        waypoints: [truckCoords],
        originCoords: truckCoords,
        destCoords: truckCoords,
        progress: 1,
        truckCoords,
        traveledPoints: [truckCoords],
        remainingPoints: [truckCoords],
        angle: headingAngle,
        speed: liveSpeed,
        ignition: liveIgnition,
        provider: trip?.provider || trip?.gps_provider_name || 'WheelsEye Fleet GPS',
      };
    }

    const originCoords = getCityCoords(oCity, truckCoords);
    const destCoords = getCityCoords(dCity, truckCoords);

    return {
      isStationary: false,
      hasRealGps: true,
      originCity: oCity,
      destCity: dCity,
      currentLocation: locName,
      corridorKey: `${oCity.toLowerCase()}-${dCity.toLowerCase()}`,
      reverseKey: `${dCity.toLowerCase()}-${oCity.toLowerCase()}`,
      waypoints: [originCoords, truckCoords, destCoords],
      originCoords,
      destCoords,
      progress: Math.min(0.95, Math.max(0.05, trip?.progress ? trip.progress / 100 : 0.50)),
      truckCoords,
      traveledPoints: [originCoords, truckCoords],
      remainingPoints: [truckCoords, destCoords],
      angle: headingAngle,
      speed: liveSpeed,
      ignition: liveIgnition,
      provider: trip?.provider || trip?.gps_provider_name || 'WheelsEye Fleet GPS',
    };
  }

  if (isStationary) {
    return {
      isStationary: true,
      hasRealGps: false,
      originCity: oCity,
      destCity: oCity,
      currentLocation: `${oCity} Depot Hub`,
      originCoords,
      destCoords: originCoords,
      truckCoords: originCoords,
      waypoints: [originCoords],
      traveledPoints: [originCoords],
      remainingPoints: [originCoords],
      angle: headingAngle,
      speed: 0,
      ignition: false,
      provider: trip?.gps_provider_name || 'Transporter Hub',
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
    hasRealGps: false,
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
    remainingPoints,
    angle: headingAngle,
    speed: liveSpeed,
    ignition: liveIgnition,
    provider: trip?.gps_provider_name || 'Corridor Telemetry',
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

  // Preserve user zoom and position: prevent auto-zoom out on recurring telemetry polling
  const lastSelectedTripIdRef = useRef(undefined);
  const hasFittedInitialBoundsRef = useRef(false);
  const userHasInteractedRef = useRef(false);

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

      const map = L.map(mapContainerRef.current, {
        center: [22.5, 82.0],
        zoom: isModal ? 4.2 : 3.9,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
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

      // Track user interactions (wheel zoom, pinch zoom, pan/drag) to never auto-zoom out
      map.on('movestart', (e) => {
        if (e.originalEvent) {
          userHasInteractedRef.current = true;
        }
      });
      map.on('zoomstart', (e) => {
        if (e.originalEvent) {
          userHasInteractedRef.current = true;
        }
      });

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

  // Recalculate dimensions on modal resize or mount
  useEffect(() => {
    if (mapInstanceRef.current && mapReady) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
        if (!selectedTrip && !hasFittedInitialBoundsRef.current && !userHasInteractedRef.current) {
          const bounds = geoJsonLayerRef.current?.getBounds()?.isValid()
            ? geoJsonLayerRef.current.getBounds()
            : INDIA_BOUNDS;
          mapInstanceRef.current?.fitBounds(bounds, {
            padding: isModal ? [30, 30] : [20, 20],
            animate: false
          });
          hasFittedInitialBoundsRef.current = true;
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [mapReady, isModal]);

  // Dynamic ResizeObserver to auto-adapt map canvas when flex parent expands/shrinks
  useEffect(() => {
    if (!mapContainerRef.current || !mapReady) return;

    let resizeTimer = null;
    const observer = new ResizeObserver(() => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 60);
    });

    observer.observe(mapContainerRef.current);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      observer.disconnect();
    };
  }, [mapReady]);

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
          let foundState = null;
          if (routeData.currentLocation) {
            for (const st of ['Bihar', 'Haryana', 'Delhi', 'Uttar Pradesh', 'West Bengal', 'Rajasthan', 'Punjab', 'Maharashtra', 'Gujarat', 'Karnataka', 'Madhya Pradesh', 'Tamil Nadu', 'Odisha', 'Jharkhand']) {
              if (routeData.currentLocation.toLowerCase().includes(st.toLowerCase())) {
                foundState = st;
                break;
              }
            }
          }
          const homeState = foundState || getCityState(routeData.originCity);
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
      const allActivePoints = [];

      // Consolidate fleet trips to render
      const validFleet = [...(allTrips || [])];
      const selVehicleId = selectedTrip ? (selectedTrip.vehicleNumber || selectedTrip.vehicle?.vehicle_number || selectedTrip.id) : null;

      // If selectedTrip is provided and not in validFleet, append it
      if (selectedTrip && !validFleet.some(t => (t.vehicleNumber || t.id) === selVehicleId)) {
        validFleet.push(selectedTrip);
      }

      // 1. RENDER ACTIVE TRIP CORRIDORS (START -> TRUCK -> DESTINATION) & STATIONARY FLEET
      // When a vehicle is selected: HIGHLIGHT that vehicle corridor, and render other active trips dimmed
      // When NO vehicle is selected: Show ALL active started trips with their corridors!
      validFleet.forEach((veh) => {
        const vData = getTripRouteData(veh);
        const vId = veh.vehicleNumber || veh.vehicle?.vehicle_number || veh.id || 'FLEET';
        const isCurrentSelected = Boolean(selVehicleId && (vId === selVehicleId || veh.id === selectedTrip?.id));
        const isOtherWhenSelected = Boolean(selVehicleId && !isCurrentSelected);
        const liveSpeedVal = parseFloat(veh.speed || vData.speed || 0);
        const isMoving = liveSpeedVal > 0;
        const speedText = isMoving ? `${Math.round(liveSpeedVal)} km/h` : '0 km/h';

        if (!vData.isStationary) {
          // Collect points for map auto-fit
          allActivePoints.push(vData.originCoords, vData.truckCoords, vData.destCoords);

          // Corridor Polylines: Traveled (Origin -> Truck) and Remaining (Truck -> Destination)
          if (isCurrentSelected) {
            // HIGHLIGHTED SELECTED CORRIDOR: Thick vibrant glowing neon cyan & sky blue lines
            L.polyline(vData.traveledPoints, {
              color: '#00F0FF',
              weight: 9,
              opacity: 0.25,
            }).addTo(routeLayer);

            L.polyline(vData.traveledPoints, {
              color: '#00F0FF',
              weight: 5,
              opacity: 0.95,
            }).addTo(routeLayer);

            L.polyline(vData.remainingPoints, {
              color: '#38BDF8',
              weight: 3.5,
              dashArray: '6, 8',
              opacity: 0.9,
            }).addTo(routeLayer);
          } else {
            // NORMAL / MULTI-CORRIDOR DISPLAY:
            // When no vehicle selected: clean, visible route lines
            // When another vehicle is selected: dimmed to 0.30 opacity so selected vehicle pops out
            const routeOpacity = isOtherWhenSelected ? 0.30 : 0.85;
            const routeWeight = isOtherWhenSelected ? 2 : 3.5;

            L.polyline(vData.traveledPoints, {
              color: isDark ? '#00F0FF' : '#0284C7',
              weight: routeWeight,
              opacity: routeOpacity,
            }).addTo(routeLayer);

            L.polyline(vData.remainingPoints, {
              color: isDark ? '#38BDF8' : '#3B82F6',
              weight: isOtherWhenSelected ? 1.5 : 2.5,
              dashArray: '5, 6',
              opacity: isOtherWhenSelected ? 0.25 : 0.75,
            }).addTo(routeLayer);
          }

          // Point A: START PIN (Where to start - Origin Hub)
          const startHtml = `
            <div class="flex items-center gap-1 -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto ${isOtherWhenSelected ? 'opacity-40 hover:opacity-100' : 'opacity-100'} transition-opacity">
              <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${
                isCurrentSelected
                  ? (isDark ? 'bg-slate-950/95 border-2 border-emerald-400 text-emerald-300 shadow-xl' : 'bg-white/95 border-2 border-emerald-500 text-emerald-800 shadow-md')
                  : (isDark ? 'bg-slate-900/90 border border-emerald-500/50 text-emerald-400' : 'bg-white/95 border border-emerald-300 text-emerald-700 shadow-xs')
              } text-[10px] font-bold whitespace-nowrap transition-transform group-hover:scale-110">
                <span class="w-2 h-2 rounded-full bg-emerald-400 ${isCurrentSelected ? 'animate-ping' : ''}"></span>
                <span>${vData.originCity} Hub</span>
              </div>
            </div>
          `;
          const startIcon = L.divIcon({ html: startHtml, className: 'custom-start-pin bg-transparent border-0', iconSize: [110, 24], iconAnchor: [55, 12] });
          const startMarker = L.marker(vData.originCoords, { icon: startIcon, zIndexOffset: isCurrentSelected ? 900 : 300 }).addTo(routeLayer);

          startMarker.bindTooltip(`
            <div class="p-2 rounded-xl ${isDark ? 'bg-[#0d1527] border border-emerald-500/70 text-white' : 'bg-white border border-emerald-600/60 text-slate-900'} shadow-xl text-[10px] min-w-[130px] max-w-[170px] pointer-events-none text-left">
              <div class="flex items-center gap-1.5 font-bold text-[9.5px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} pb-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span class="truncate">Start: ${vData.originCity} Hub</span>
              </div>
              <div class="text-[9px] mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'} truncate">
                Truck: <b class="font-mono ${isDark ? 'text-white' : 'text-slate-900'}">${vId}</b>
              </div>
            </div>
          `, { direction: 'top', offset: [0, -12], className: 'custom-truck-tooltip', opacity: 1 });

          startMarker.on('click', () => {
            if (onSelectTrip) onSelectTrip(isCurrentSelected ? null : veh);
          });

          // Point B: LIVE VEHICLE MARKER (Where is vehicle)
          const truckHtml = `
            <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto ${isOtherWhenSelected ? 'opacity-60 hover:opacity-100' : 'opacity-100'} transition-all">
              ${isCurrentSelected ? `
                <span class="absolute -bottom-0.5 w-8 h-3 rounded-[100%] ${isDark ? 'bg-cyan-400/40' : 'bg-blue-600/30'} animate-ping pointer-events-none" style="transform: scaleY(0.45);"></span>
                <span class="absolute -bottom-0.5 w-6 h-2 rounded-[100%] ${isDark ? 'bg-cyan-400/50' : 'bg-blue-600/40'} pointer-events-none" style="transform: scaleY(0.45); filter: blur(2px);"></span>
              ` : `
                <span class="absolute -bottom-0.5 w-6 h-2 rounded-[100%] ${isDark ? 'bg-emerald-400/25' : 'bg-emerald-500/20'} animate-pulse pointer-events-none" style="transform: scaleY(0.45);"></span>
              `}

              <div class="relative transition-all duration-300 ${isCurrentSelected ? 'scale-125' : 'group-hover:scale-125'}" style="filter: drop-shadow(0 ${isCurrentSelected ? '2px 6px rgba(0,240,255,0.45)' : '1.5px 3px rgba(0,0,0,0.25)'});">
                <img
                  src="/images/real-truck-marker.png?v=pure_v1"
                  alt="${vId}"
                  class="object-contain pointer-events-none select-none"
                  style="display: block; width: ${isCurrentSelected ? 29 : 23}px; height: auto; object-fit: contain;"
                />
                <span class="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isCurrentSelected ? 'bg-cyan-400' : 'bg-emerald-400'} opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-1.5 w-1.5 ${isCurrentSelected ? 'bg-cyan-400' : 'bg-emerald-500'} border border-white dark:border-slate-900 shadow-xs"></span>
                </span>
              </div>

              <!-- Floating Micro-Pill with Plate & Speed -->
              <div class="mt-0.5 px-1.5 py-0.2 rounded text-[8px] font-mono font-bold whitespace-nowrap shadow-xs transition-all group-hover:scale-115 z-10 ${
                isCurrentSelected
                  ? (isDark ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 shadow-lg ring-1 ring-cyan-400/50' : 'bg-blue-600 text-white border border-blue-700 shadow-md')
                  : (isDark ? 'bg-slate-950/90 text-cyan-300 border border-slate-700/80 group-hover:border-cyan-400' : 'bg-white/95 text-slate-800 border border-slate-300/90 group-hover:border-blue-500')
              }">
                <span class="tracking-tight">${vId}</span>
                ${isMoving ? `<span class="${isCurrentSelected ? 'text-cyan-200' : (isDark ? 'text-slate-500' : 'text-slate-400')} mx-0.5">•</span><span class="${isCurrentSelected ? 'text-white font-black' : (isDark ? 'text-emerald-400' : 'text-emerald-600')}">${speedText}</span>` : ''}
              </div>
            </div>
          `;
          const truckIcon = L.divIcon({ html: truckHtml, className: 'custom-truck-beacon bg-transparent border-0', iconSize: [44, 28], iconAnchor: [22, 12] });
          const truckMarker = L.marker(vData.truckCoords, { icon: truckIcon, zIndexOffset: isCurrentSelected ? 1200 : 500 }).addTo(routeLayer);

          truckMarker.bindTooltip(`
            <div class="p-2 sm:p-2.5 rounded-xl ${isDark ? 'bg-[#0d1527] border border-cyan-500/80 text-white' : 'bg-white border border-blue-600/70 text-slate-900'} shadow-2xl min-w-[155px] max-w-[190px] pointer-events-none text-left">
              <div class="flex items-center justify-between gap-1 pb-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}">
                <div class="font-mono font-black text-[11px] ${isDark ? 'text-cyan-300' : 'text-blue-700'} flex items-center gap-1">
                  <span>🚛</span> ${vId}
                </div>
                <span class="px-1.5 py-0.2 rounded text-[8px] font-bold ${isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}">
                  ● ${speedText}
                </span>
              </div>
              <div class="mt-1 space-y-0.5 text-[9.5px]">
                <div class="truncate ${isDark ? 'text-slate-200' : 'text-slate-800'} font-medium">
                  📍 ${vData.currentLocation}
                </div>
                <div class="flex items-center gap-1 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}">
                  <span>🛣️</span>
                  <span class="${isDark ? 'text-emerald-400' : 'text-emerald-700'}">${vData.originCity}</span>
                  <span>➔</span>
                  <span class="${isDark ? 'text-rose-400' : 'text-rose-600'}">${vData.destCity}</span>
                </div>
              </div>
              <div class="text-[8px] font-bold mt-1 pt-1 border-t ${isDark ? 'border-slate-800/80 text-cyan-400' : 'border-slate-100 text-blue-600'}">
                ${isCurrentSelected ? '★ Highlighted (Click to Deselect)' : 'Click to highlight route'}
              </div>
            </div>
          `, { direction: 'top', offset: [0, -18], className: 'custom-truck-tooltip', opacity: 1 });

          truckMarker.on('click', () => {
            if (onSelectTrip) onSelectTrip(isCurrentSelected ? null : veh);
          });

          // Point C: DESTINATION PIN (Where to going - Destination Hub)
          const nextHtml = `
            <div class="flex items-center gap-1 -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto ${isOtherWhenSelected ? 'opacity-40 hover:opacity-100' : 'opacity-100'} transition-opacity">
              <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${
                isCurrentSelected
                  ? (isDark ? 'bg-slate-950/95 border-2 border-rose-400 text-rose-300 shadow-xl' : 'bg-white/95 border-2 border-rose-500 text-rose-800 shadow-md')
                  : (isDark ? 'bg-slate-900/90 border border-rose-500/50 text-rose-400' : 'bg-white/95 border border-rose-300 text-rose-700 shadow-xs')
              } text-[10px] font-bold whitespace-nowrap transition-transform group-hover:scale-110">
                <span class="w-2 h-2 rounded-full bg-rose-500 ${isCurrentSelected ? 'animate-ping' : ''}"></span>
                <span>${vData.destCity} Hub</span>
              </div>
            </div>
          `;
          const nextIcon = L.divIcon({ html: nextHtml, className: 'custom-next-pin bg-transparent border-0', iconSize: [110, 24], iconAnchor: [55, 12] });
          const nextMarker = L.marker(vData.destCoords, { icon: nextIcon, zIndexOffset: isCurrentSelected ? 900 : 300 }).addTo(routeLayer);

          nextMarker.bindTooltip(`
            <div class="p-2 rounded-xl ${isDark ? 'bg-[#0d1527] border border-rose-500/70 text-white' : 'bg-white border border-rose-600/60 text-slate-900'} shadow-xl text-[10px] min-w-[130px] max-w-[170px] pointer-events-none text-left">
              <div class="flex items-center gap-1.5 font-bold text-[9.5px] ${isDark ? 'text-rose-400' : 'text-rose-700'} pb-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                <span class="truncate">Dest: ${vData.destCity} Hub</span>
              </div>
              <div class="text-[9px] mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'} truncate">
                ETA: <b class="${isDark ? 'text-white' : 'text-slate-900'}">${veh.eta || 'Scheduled'}</b>
              </div>
            </div>
          `, { direction: 'top', offset: [0, -12], className: 'custom-truck-tooltip', opacity: 1 });

          nextMarker.on('click', () => {
            if (onSelectTrip) onSelectTrip(isCurrentSelected ? null : veh);
          });

        } else {
          // STATIONARY VEHICLE AT YARD / DEPOT
          allActivePoints.push(vData.truckCoords);

          const yardHtml = `
            <div class="relative flex flex-col items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer group pointer-events-auto ${isOtherWhenSelected ? 'opacity-40 hover:opacity-100' : 'opacity-85'} transition-all">
              <div class="relative transition-all duration-200 group-hover:scale-120" style="filter: drop-shadow(0 1.5px 3px rgba(0,0,0,0.25));">
                <img
                  src="/images/real-truck-marker.png?v=pure_v1"
                  alt="${vId}"
                  class="object-contain pointer-events-none select-none"
                  style="display: block; width: ${isCurrentSelected ? 27 : 21}px; height: auto; object-fit: contain;"
                />
                <span class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${isCurrentSelected ? 'bg-cyan-400' : 'bg-blue-500'} border border-white dark:border-slate-900 shadow-xs"></span>
              </div>
              <div class="mt-0.5 px-1 py-0.2 rounded text-[7.5px] font-mono font-bold whitespace-nowrap shadow-xs ${
                isDark ? 'bg-slate-950/80 text-slate-400 border border-slate-800' : 'bg-white/90 text-slate-600 border border-slate-200'
              }">
                <span>${vId}</span>
              </div>
            </div>
          `;
          const yardIcon = L.divIcon({ html: yardHtml, className: 'custom-yard-pin bg-transparent border-0', iconSize: [36, 24], iconAnchor: [18, 10] });
          const yardMarker = L.marker(vData.truckCoords, { icon: yardIcon, zIndexOffset: isCurrentSelected ? 1100 : 200 }).addTo(routeLayer);

          yardMarker.bindTooltip(`
            <div class="p-2 sm:p-2.5 rounded-xl ${isDark ? 'bg-[#0d1527] border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'} shadow-2xl min-w-[145px] max-w-[185px] pointer-events-none text-left">
              <div class="flex items-center justify-between gap-1 pb-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}">
                <span class="font-mono font-black text-[11px] ${isDark ? 'text-cyan-300' : 'text-blue-700'}">🚛 ${vId}</span>
                <span class="px-1.5 py-0.2 rounded text-[8px] font-bold ${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
                  🅿️ Stationed
                </span>
              </div>
              <div class="mt-1 text-[9.5px] truncate ${isDark ? 'text-slate-200' : 'text-slate-800'} font-medium">
                📍 ${vData.currentLocation}
              </div>
              <div class="text-[8px] font-bold mt-1 pt-1 border-t ${isDark ? 'border-slate-800/80 text-cyan-400' : 'border-slate-100 text-blue-600'}">
                ${isCurrentSelected ? '★ Selected (Click to Deselect)' : 'Click to select truck'}
              </div>
            </div>
          `, { direction: 'top', offset: [0, -16], className: 'custom-truck-tooltip', opacity: 1 });

          yardMarker.on('click', () => {
            if (onSelectTrip) onSelectTrip(isCurrentSelected ? null : veh);
          });
        }
      });

      // Fit Bounds: ONLY fit bounds when selectedTrip actually changes or on initial mount!
      // Routine telemetry updates (every 10s) must NEVER zoom out or override user's manual zoom!
      const currentSelectedTripId = selectedTrip
        ? (selectedTrip.vehicleNumber || selectedTrip.vehicle?.vehicle_number || selectedTrip.id)
        : null;
      const selectedTripChanged = lastSelectedTripIdRef.current !== currentSelectedTripId;
      lastSelectedTripIdRef.current = currentSelectedTripId;

      if (selectedTripChanged) {
        userHasInteractedRef.current = false;
        if (selectedTrip) {
          const selRoute = getTripRouteData(selectedTrip);
          if (!selRoute.isStationary) {
            map.fitBounds([selRoute.originCoords, selRoute.truckCoords, selRoute.destCoords], {
              padding: isModal ? [50, 50] : [40, 40],
              maxZoom: 7.5,
              animate: true
            });
          } else {
            map.flyTo(selRoute.truckCoords, 8.5, { duration: 1.2 });
          }
        } else {
          // Deselected vehicle - return smoothly to full fleet view
          if (allActivePoints.length > 0) {
            map.fitBounds(allActivePoints, {
              padding: isModal ? [40, 40] : [30, 30],
              maxZoom: 6.5,
              animate: true
            });
          } else {
            const bounds = geoLayer?.getBounds()?.isValid() ? geoLayer.getBounds() : INDIA_BOUNDS;
            map.fitBounds(bounds, {
              padding: isModal ? [30, 30] : [20, 20],
              animate: true
            });
          }
        }
      } else if (!hasFittedInitialBoundsRef.current && !userHasInteractedRef.current) {
        // Initial fit on first render with points
        if (allActivePoints.length > 0) {
          map.fitBounds(allActivePoints, {
            padding: isModal ? [40, 40] : [30, 30],
            maxZoom: 6.5,
            animate: false
          });
          hasFittedInitialBoundsRef.current = true;
        } else {
          const bounds = geoLayer?.getBounds()?.isValid() ? geoLayer.getBounds() : INDIA_BOUNDS;
          map.fitBounds(bounds, {
            padding: isModal ? [30, 30] : [20, 20],
            animate: false
          });
          hasFittedInitialBoundsRef.current = true;
        }
      }

    });
  }, [mapReady, geoJsonData, selectedTrip, allTrips, onSelectTrip, isModal, isDark]);

  const handleZoomIn = () => {
    userHasInteractedRef.current = true;
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    userHasInteractedRef.current = true;
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleReset = () => {
    userHasInteractedRef.current = false;
    if (mapInstanceRef.current) {
      const bounds = geoJsonLayerRef.current?.getBounds()?.isValid()
        ? geoJsonLayerRef.current.getBounds()
        : INDIA_BOUNDS;
      mapInstanceRef.current.fitBounds(bounds, {
        padding: isModal ? [30, 30] : [20, 20],
        animate: true
      });
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
    <div className={`relative rounded-2xl ${isDark ? 'bg-[#070B14] border-slate-800' : 'bg-slate-50 border-slate-200'} border overflow-hidden flex flex-col justify-between ${isModal ? 'h-full min-h-[550px]' : 'h-full min-h-[460px]'} ${className}`}>
      
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
        className={`w-full flex-1 ${isModal ? 'h-full min-h-[550px]' : 'h-full min-h-[460px]'} z-0 focus:outline-none`}
        style={{ background: isDark ? '#070B14' : '#F8FAFC' }}
      />

      {/* Bottom Map Floating Telemetry & Controls Toolbar */}
      <div className={`absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] border-t pt-2 z-[400] pointer-events-none ${
        isDark ? 'text-slate-400 border-slate-800/80' : 'text-slate-600 border-slate-200'
      }`}>
        
        {/* Speed / Status Badge & Center Button in Single Row */}
        <div className="flex items-center gap-2 pointer-events-auto flex-nowrap min-w-0 max-w-[calc(100%-115px)]">
          {selectedTrip ? (
            selectedTrip.isTransit ? (
              <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-[11px] font-bold shadow-lg backdrop-blur-md flex-nowrap min-w-0 shrink ${
                isDark ? 'bg-slate-950/95 border-cyan-400/40 text-white' : 'bg-white/95 border-blue-400 text-slate-900 shadow-md'
              }`}>
                <div className="flex items-center gap-1.5 text-emerald-500 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="truncate max-w-[90px] sm:max-w-none">{selectedTrip.originCity || selectedTrip.branchCity || 'Origin'} Hub</span>
                </div>

                <span className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>➔</span>

                <div className={`flex items-center gap-1.5 shrink-0 min-w-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                  <Truck className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono">{selectedTrip.vehicleNumber || selectedTrip.id}</span>
                  <span className={`text-[10px] font-normal truncate max-w-[120px] sm:max-w-[180px] hidden md:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    • {selectedTrip.currentLocation || selectedTrip.route || 'Expressway'}
                  </span>
                </div>

                <span className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>➔</span>

                <div className="flex items-center gap-1.5 text-rose-500 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="truncate max-w-[90px] sm:max-w-none">{selectedTrip.destCity || selectedTrip.originCity || 'Destination'} Hub</span>
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
              <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-[11px] font-bold shadow-lg backdrop-blur-md flex-nowrap min-w-0 shrink ${
                isDark ? 'bg-slate-950/95 border-cyan-400/40 text-white' : 'bg-white/95 border-blue-400 text-slate-900 shadow-md'
              }`}>
                <div className={`flex items-center gap-1.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                  <Truck className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono">{selectedTrip.vehicleNumber || selectedTrip.id}</span>
                </div>
                <span className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${selectedTrip.isMoving ? 'bg-emerald-400 animate-pulse' : 'bg-blue-500'}`}></span>
                  <span className={`text-[11px] font-semibold truncate max-w-[140px] sm:max-w-[230px] md:max-w-[340px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    📍 {selectedTrip.currentLocation || `${selectedTrip.branchCity || 'Yard'} Depot`}
                  </span>
                </div>
                <span className={`shrink-0 ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>•</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0 ${
                  selectedTrip.isMoving
                    ? isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {selectedTrip.isMoving ? `Moving • ${selectedTrip.speed}` : 'Parked • 0 km/h'}
                </span>
              </div>
            )
          ) : (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-[11px] font-semibold shadow-md backdrop-blur-sm truncate ${
              isDark ? 'bg-slate-950/90 border-slate-800 text-slate-300' : 'bg-white/95 border-slate-200 text-slate-700'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="font-bold text-emerald-400">{activeTripsCount} Active Trips On Map</span>
              <span className="text-slate-500">•</span>
              <span className="truncate">Showing Start Hub ➔ Truck ➔ Destination (Select to highlight)</span>
            </div>
          )}
          {selectedTrip && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleFocusVehicle}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-semibold transition-all shadow-md cursor-pointer ${
                  isDark ? 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/40 text-cyan-300' : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600'
                }`}
                title="Focus Vehicle on Map"
              >
                <Navigation className="w-3 h-3" />
                <span>Center</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTrip && onSelectTrip(null)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all shadow-md cursor-pointer ${
                  isDark ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                }`}
                title="View All Running Trips"
              >
                <span>✕ All Trips</span>
              </button>
            </div>
          )}
        </div>

        {/* Map Control Buttons: Zoom In, Zoom Out, Fit India Boundaries */}
        <div className="flex items-center space-x-1.5 pointer-events-auto shrink-0">
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
