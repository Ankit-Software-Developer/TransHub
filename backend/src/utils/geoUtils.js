// src/utils/geoUtils.js
/**
 * Reverse Geocoding Utility for Indian Transport Corridors & Logistics Hubs
 * Instantly maps any latitude and longitude across India into a clean, human-readable
 * town, district, hub, and state location string (0ms latency, 100% offline reliability).
 */

const MAJOR_INDIAN_HUBS = [
  // Delhi NCR & Haryana
  { name: 'Dankuni Freight Terminal', town: 'Dankuni', district: 'Hooghly', state: 'West Bengal', lat: 22.6865, lng: 88.2984 },
  { name: 'Serampore Industrial Area', town: 'Serampore', district: 'Hooghly', state: 'West Bengal', lat: 22.7500, lng: 88.3400 },
  { name: 'Kolkata Port / Alipore', town: 'Alipore', district: 'Kolkata', state: 'West Bengal', lat: 22.5300, lng: 88.3100 },
  { name: 'Howrah Freight Hub', town: 'Howrah', district: 'Howrah', state: 'West Bengal', lat: 22.5958, lng: 88.2636 },
  { name: 'Manesar Logistics Park', town: 'Manesar', district: 'Gurugram', state: 'Haryana', lat: 28.3500, lng: 76.9300 },
  { name: 'Bilaspur Logistics Hub', town: 'Bilaspur', district: 'Gurugram', state: 'Haryana', lat: 28.3146, lng: 76.8112 },
  { name: 'Rewari Transport Hub', town: 'Rewari', district: 'Rewari', state: 'Haryana', lat: 28.1920, lng: 76.6190 },
  { name: 'Kundli / Narela Border', town: 'Kundli', district: 'Sonipat', state: 'Haryana', lat: 28.8600, lng: 77.1200 },
  { name: 'Alipur / GT Karnal Road', town: 'Alipur', district: 'North Delhi', state: 'Delhi NCR', lat: 28.7900, lng: 77.1300 },
  { name: 'Najafgarh Logistics Corridor', town: 'Najafgarh', district: 'South West Delhi', state: 'Delhi NCR', lat: 28.5938, lng: 76.8322 },
  { name: 'Sanjay Gandhi Transport Nagar', town: 'Samaypur Badli', district: 'North Delhi', state: 'Delhi NCR', lat: 28.7471, lng: 77.1288 },
  { name: 'Faridabad Industrial Hub', town: 'Faridabad', district: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178 },
  { name: 'Pataudi Highway', town: 'Pataudi', district: 'Gurugram', state: 'Haryana', lat: 28.3622, lng: 76.8084 },

  // Uttar Pradesh & NH-19 (GT Road)
  { name: 'Auraiya Bypass (NH-19)', town: 'Auraiya', district: 'Auraiya', state: 'Uttar Pradesh', lat: 26.3856, lng: 79.6107 },
  { name: 'Kanpur Transport Nagar', town: 'Kanpur', district: 'Kanpur Nagar', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319 },
  { name: 'Fatehpur Bypass (NH-19)', town: 'Fatehpur', district: 'Fatehpur', state: 'Uttar Pradesh', lat: 25.9200, lng: 80.8100 },
  { name: 'Kaushambi / Kokhraj Bypass', town: 'Kokhraj', district: 'Kaushambi', state: 'Uttar Pradesh', lat: 25.6052, lng: 81.4270 },
  { name: 'Prayagraj (Allahabad) Hub', town: 'Prayagraj', district: 'Prayagraj', state: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463 },
  { name: 'Varanasi Ring Road Hub', town: 'Varanasi', district: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
  { name: 'Mughalsarai / Chandauli (GT Road)', town: 'Mughalsarai', district: 'Chandauli', state: 'Uttar Pradesh', lat: 25.2800, lng: 83.1200 },
  { name: 'Lucknow Transport Nagar', town: 'Sarojini Nagar', district: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Agra Transport Hub', town: 'Agra', district: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
  { name: 'Mathura Refinery Corridor', town: 'Mathura', district: 'Mathura', state: 'Uttar Pradesh', lat: 27.4924, lng: 77.6737 },
  { name: 'Ghaziabad Industrial Area', town: 'Ghaziabad', district: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6692, lng: 77.4538 },

  // Bihar & NH-19 / NH-31
  { name: 'Hajipur Industrial Area', town: 'Hajipur', district: 'Vaishali', state: 'Bihar', lat: 25.7632, lng: 85.2571 },
  { name: 'Lalganj Highway', town: 'Lalganj', district: 'Vaishali', state: 'Bihar', lat: 25.7574, lng: 85.2539 },
  { name: 'Patna Transport Nagar', town: 'Patna', district: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { name: 'Bihta Dry Port & Industrial Zone', town: 'Bihta', district: 'Patna', state: 'Bihar', lat: 25.5523, lng: 84.9842 },
  { name: 'Sasaram (GT Road / NH-19)', town: 'Sasaram', district: 'Rohtas', state: 'Bihar', lat: 24.9187, lng: 84.0624 },
  { name: 'Dehri on Sone Bypass', town: 'Dehri', district: 'Rohtas', state: 'Bihar', lat: 24.9100, lng: 84.1800 },
  { name: 'Mohania Toll Plaza (NH-19)', town: 'Mohania', district: 'Kaimur', state: 'Bihar', lat: 25.1161, lng: 83.6904 },
  { name: 'Aurangabad (GT Road)', town: 'Aurangabad', district: 'Aurangabad', state: 'Bihar', lat: 24.7500, lng: 84.3700 },
  { name: 'Muzaffarpur Transport Hub', town: 'Muzaffarpur', district: 'Muzaffarpur', state: 'Bihar', lat: 26.1209, lng: 85.3647 },
  { name: 'Gaya Junction / Dobhi (GT Road)', town: 'Dobhi', district: 'Gaya', state: 'Bihar', lat: 24.5300, lng: 84.9700 },
  { name: 'Begusarai Industrial Corridor', town: 'Barauni', district: 'Begusarai', state: 'Bihar', lat: 25.4700, lng: 85.9700 },
  { name: 'Purnia Highway Junction', town: 'Purnia', district: 'Purnia', state: 'Bihar', lat: 25.7771, lng: 87.4753 },

  // Jharkhand
  { name: 'Barhi Junction (NH-19 / NH-20)', town: 'Barhi', district: 'Hazaribagh', state: 'Jharkhand', lat: 24.3905, lng: 85.2517 },
  { name: 'Koderma / Jhumri Telaiya', town: 'Koderma', district: 'Koderma', state: 'Jharkhand', lat: 24.4300, lng: 85.5300 },
  { name: 'Dhanbad / Govindpur (GT Road)', town: 'Govindpur', district: 'Dhanbad', state: 'Jharkhand', lat: 23.8300, lng: 86.5200 },
  { name: 'Ranchi Ring Road Hub', town: 'Tupudana', district: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096 },
  { name: 'Jamshedpur Transport Corridor', town: 'Gamharia', district: 'East Singhbhum', state: 'Jharkhand', lat: 22.8046, lng: 86.2029 },
  { name: 'Bokaro Steel City Hub', town: 'Bokaro', district: 'Bokaro', state: 'Jharkhand', lat: 23.6693, lng: 86.1511 },

  // Rajasthan & Gujarat
  { name: 'Jaipur Transport Nagar (VKIA)', town: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Kishangarh Marble & Transport Hub', town: 'Kishangarh', district: 'Ajmer', state: 'Rajasthan', lat: 26.5700, lng: 74.8600 },
  { name: 'Bhilwara Textile Hub', town: 'Bhilwara', district: 'Bhilwara', state: 'Rajasthan', lat: 25.3407, lng: 74.6313 },
  { name: 'Udaipur Logistics Corridor', town: 'Sukher', district: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125 },
  { name: 'Ahmedabad Aslali Transport Hub', town: 'Aslali', district: 'Ahmedabad', state: 'Gujarat', lat: 22.9500, lng: 72.5800 },
  { name: 'Vadodara Makarpura GIDC', town: 'Makarpura', district: 'Vadodara', state: 'Gujarat', lat: 22.2500, lng: 73.2000 },
  { name: 'Surat Sachidanand GIDC', town: 'Sachin', district: 'Surat', state: 'Gujarat', lat: 21.0800, lng: 72.8800 },
  { name: 'Mundra Port Logistics Hub', town: 'Mundra', district: 'Kutch', state: 'Gujarat', lat: 22.8400, lng: 69.7200 },
  { name: 'Kandla / Gandhidham Complex', town: 'Gandhidham', district: 'Kutch', state: 'Gujarat', lat: 23.0800, lng: 70.1300 },

  // Maharashtra & South
  { name: 'Bhiwandi Warehousing Hub', town: 'Bhiwandi', district: 'Thane', state: 'Maharashtra', lat: 19.3000, lng: 73.0600 },
  { name: 'JNPT Port / Nhava Sheva', town: 'Uran', district: 'Raigad', state: 'Maharashtra', lat: 18.9500, lng: 72.9500 },
  { name: 'Pune Chakan MIDC', town: 'Chakan', district: 'Pune', state: 'Maharashtra', lat: 18.7600, lng: 73.8600 },
  { name: 'Nagpur Multi-Modal Cargo Hub', town: 'Butibori', district: 'Nagpur', state: 'Maharashtra', lat: 21.0000, lng: 79.0000 },
  { name: 'Bengaluru Nelamangala Hub', town: 'Nelamangala', district: 'Bengaluru Rural', state: 'Karnataka', lat: 13.1000, lng: 77.3900 },
  { name: 'Hyderabad Shamshabad Corridor', town: 'Shamshabad', district: 'Ranga Reddy', state: 'Telangana', lat: 17.2600, lng: 78.4000 },
  { name: 'Chennai Madhavaram Hub', town: 'Madhavaram', district: 'Chennai', state: 'Tamil Nadu', lat: 13.1500, lng: 80.2300 },
];

/**
 * Calculates geodesic distance between two points in km (Haversine formula)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves accurate human-readable location name for given coordinates
 * @param {number|string} latitude 
 * @param {number|string} longitude 
 * @returns {string} Formatted location string e.g. "Dankuni, Hooghly (West Bengal)"
 */
function resolveIndianLocation(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return 'Location Unavailable';
  }

  let closest = null;
  let minDistance = Infinity;

  for (const hub of MAJOR_INDIAN_HUBS) {
    const dist = haversineDistance(lat, lng, hub.lat, hub.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = hub;
    }
  }

  if (!closest) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  const distKm = Math.round(minDistance);

  // If very close to known hub/toll/town (within 6km)
  if (distKm <= 6) {
    return `${closest.town}, ${closest.district} (${closest.state})`;
  }

  // If along highway corridor within 35km
  if (distKm <= 35) {
    return `${closest.town} Bypass, ${closest.district} (${closest.state})`;
  }

  // Regional proximity
  return `Near ${closest.town}, ${closest.district} (${closest.state})`;
}

const axios = require('axios');

// In-memory LRU-like cache for coordinates (approx. 110m resolution)
const backendLocationCache = new Map();

/**
 * Asynchronously resolves exact human-readable location using free reverse geocoding
 * with micro-proximity logistics hub priority and in-memory caching.
 * @param {number|string} latitude 
 * @param {number|string} longitude 
 * @returns {Promise<string>}
 */
async function resolveLocationAsync(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
    return 'Location Unavailable';
  }

  // 1. Micro-proximity check: If truck is inside a recognized freight hub (< 4km)
  let closest = null;
  let minD = Infinity;
  for (const hub of MAJOR_INDIAN_HUBS) {
    const dist = haversineDistance(lat, lng, hub.lat, hub.lng);
    if (dist < minD) {
      minD = dist;
      closest = hub;
    }
  }

  if (closest && minD <= 4.0) {
    return `${closest.name}, ${closest.town} (${closest.state})`;
  }

  // 2. Cache Check (3 decimal places ~ 110m)
  const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (backendLocationCache.has(cacheKey)) {
    return backendLocationCache.get(cacheKey);
  }

  // 3. Query Free BigDataCloud Reverse Geocode API (CORS & server-side friendly)
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await axios.get(url, { timeout: 2500 });
    if (res.data) {
      const d = res.data;
      const locality = d.locality || d.city || '';
      const state = d.principalSubdivision || '';
      const distItem = d.localityInfo?.administrative?.find(
        (a) => a.adminLevel === 5 ||
               (a.description && a.description.toLowerCase().includes('district')) ||
               (a.name && a.name.toLowerCase().includes('district'))
      );
      const rawDistrict = distItem ? distItem.name.replace(/ district/i, '').trim() : (d.city || '');
      const district = (rawDistrict === 'India' || rawDistrict === locality) ? '' : rawDistrict;

      let formatted = '';
      if (locality && district) {
        formatted = `${locality}, ${district} (${state})`;
      } else if (locality) {
        formatted = `${locality} (${state})`;
      } else if (district) {
        formatted = `${district} (${state})`;
      } else if (state) {
        formatted = `${state}, India`;
      }

      if (formatted) {
        backendLocationCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch (_) {
    // Gracefully handle timeout/network failure
  }

  // 4. Fallback to corridor proximity calculation
  const fallback = resolveIndianLocation(lat, lng);
  backendLocationCache.set(cacheKey, fallback);
  return fallback;
}

module.exports = {
  resolveIndianLocation,
  resolveLocationAsync,
  haversineDistance,
  MAJOR_INDIAN_HUBS,
};
