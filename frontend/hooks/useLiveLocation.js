'use client';

import { useState, useEffect } from 'react';
import { resolveExactLiveLocation, getLocalApproximation } from '../services/geocodingService';

/**
 * React Hook for Real-Time Exact Live Reverse Geocoding
 * 
 * @param {number|string} latitude 
 * @param {number|string} longitude 
 * @param {string} [initialLocationName] 
 * @returns {{ location: string, isExact: boolean, source: string, isLoading: boolean }}
 */
export function useLiveLocation(latitude, longitude, initialLocationName) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasCoords = !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);

  // Check if initialLocationName is already a specific name (not generic approximation like 'Near ...')
  const isGeneric = !initialLocationName || 
                    initialLocationName.startsWith('Near Lat') || 
                    initialLocationName.startsWith('Near ') ||
                    initialLocationName === 'Live Telematics' ||
                    initialLocationName === 'Location Detected';

  const [location, setLocation] = useState(() => {
    if (!isGeneric && initialLocationName) return initialLocationName;
    if (hasCoords) return getLocalApproximation(lat, lng);
    return 'Location Unavailable';
  });

  const [isExact, setIsExact] = useState(!isGeneric && Boolean(initialLocationName));
  const [source, setSource] = useState(isGeneric ? 'Approximation' : 'Preloaded');
  const [isLoading, setIsLoading] = useState(hasCoords && isGeneric);

  useEffect(() => {
    if (!hasCoords) return;

    let isMounted = true;
    setIsLoading(true);

    resolveExactLiveLocation(lat, lng)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.formatted) {
          setLocation(res.formatted);
          setIsExact(Boolean(res.isExact));
          setSource(res.source || 'Free Map API');
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lat, lng, hasCoords]);

  return { location, isExact, source, isLoading };
}
