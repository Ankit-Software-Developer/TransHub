// frontend/components/ui/CitySearchInput.js
'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X, Check, Plus, Building2, Globe2, Loader2 } from 'lucide-react';

// Comprehensive Indian Logistics Cities, Tier-1/2/3 Hubs & Major Transport Towns with Search Aliases
export const INDIAN_LOGISTICS_CITIES = [
  // Karnataka
  { city: 'Bengaluru', aliases: ['bangalore', 'banglore', 'bengalooru'], state: 'Karnataka', hub: 'Nelamangala / Peenya / Bommasandra Hub' },
  { city: 'Bangalore', aliases: ['bengaluru', 'banglore'], state: 'Karnataka', hub: 'Nelamangala / Whitefield / Electronic City' },
  { city: 'Mangaluru', aliases: ['mangalore'], state: 'Karnataka', hub: 'Baikampady Industrial Area / Port' },
  { city: 'Mysuru', aliases: ['mysore'], state: 'Karnataka', hub: 'Hebbal / Belagola Industrial Area' },
  { city: 'Belagavi', aliases: ['belgaum'], state: 'Karnataka', hub: 'Udyambag / Machhe Industrial' },
  { city: 'Hubballi', aliases: ['hubli'], state: 'Karnataka', hub: 'Gokul Road / Tarihal Industrial Estate' },
  { city: 'Dharwad', aliases: ['hubli-dharwad'], state: 'Karnataka', hub: 'Belur Industrial Area' },
  { city: 'Ballari', aliases: ['bellary'], state: 'Karnataka', hub: 'Steel & Mining Transport Hub' },
  { city: 'Kalaburagi', aliases: ['gulbarga'], state: 'Karnataka', hub: 'Cement & Pulse Freight Zone' },
  { city: 'Vijayapura', aliases: ['bijapur'], state: 'Karnataka', hub: 'Agri-Logistics Hub' },
  { city: 'Tumakuru', aliases: ['tumkur'], state: 'Karnataka', hub: 'Vasanthanarasapura Industrial Park' },
  { city: 'Shivamogga', aliases: ['shimoga'], state: 'Karnataka', hub: 'Machinery & Steel Hub' },
  { city: 'Davanagere', aliases: ['davangere'], state: 'Karnataka', hub: 'Central Karnataka Logistics Hub' },

  // Delhi NCR & Haryana
  { city: 'Delhi', aliases: ['delhi ncr', 'dilli', 'new delhi'], state: 'Delhi NCR', hub: 'Capital Hub / Sanjay Gandhi TPT Nagar' },
  { city: 'New Delhi', aliases: ['delhi', 'central delhi'], state: 'Delhi NCR', hub: 'Central Logistics Hub' },
  { city: 'South West Delhi', aliases: ['najafgarh', 'dwarka', 'kapashera'], state: 'Delhi NCR', hub: 'Najafgarh / Dwarka Logistics Corridor' },
  { city: 'North Delhi', aliases: ['alipur', 'kundli border', 'narela'], state: 'Delhi NCR', hub: 'Alipur / GT Karnal Road Hub' },
  { city: 'Gurugram', aliases: ['gurgaon'], state: 'Haryana', hub: 'Bilaspur / Manesar Logistics Park' },
  { city: 'Gurgaon', aliases: ['gurugram'], state: 'Haryana', hub: 'Pataudi Highway / Bilaspur Hub' },
  { city: 'Faridabad', aliases: ['ballabhgarh'], state: 'Haryana', hub: 'Industrial Corridor & Inland Container Depot' },
  { city: 'Sonipat', aliases: ['sonepat', 'kundli'], state: 'Haryana', hub: 'Kundli / Murthal Corridor' },
  { city: 'Panipat', aliases: ['textile city'], state: 'Haryana', hub: 'Refinery & Textile Transport Hub' },
  { city: 'Karnal', aliases: ['gt road'], state: 'Haryana', hub: 'Agri & Food Processing Hub' },
  { city: 'Ambala', aliases: ['ambala cantt'], state: 'Haryana', hub: 'Northern Railway & Highway Junction' },
  { city: 'Hisar', aliases: ['hissar'], state: 'Haryana', hub: 'Steel City & West Haryana Hub' },
  { city: 'Rohtak', aliases: ['sampla'], state: 'Haryana', hub: 'IMT Rohtak Industrial Area' },
  { city: 'Rewari', aliases: ['bawal', 'dharuhera'], state: 'Haryana', hub: 'Bawal Industrial Corridor / NH-48' },
  { city: 'Bawal', aliases: ['rewari bawal'], state: 'Haryana', hub: 'RIICO / HSIIDC Industrial Growth Center' },

  // Maharashtra
  { city: 'Mumbai', aliases: ['bombay', 'navi mumbai'], state: 'Maharashtra', hub: 'Kalamboli / Cotton Green / Wadala' },
  { city: 'Bhiwandi', aliases: ['thane bhiwandi', 'mankoli'], state: 'Maharashtra', hub: 'Major Central Warehousing & Logistics Hub' },
  { city: 'Navi Mumbai', aliases: ['vashi', 'turbhe', 'jnpt', 'nhava sheva'], state: 'Maharashtra', hub: 'JNPT Port / Nhava Sheva / Turbhe' },
  { city: 'Thane', aliases: ['wagle estate'], state: 'Maharashtra', hub: 'Wagle Industrial Estate' },
  { city: 'Pune', aliases: ['poona', 'chakan', 'bhosari'], state: 'Maharashtra', hub: 'Chakan / Bhosari / Talegaon MIDC' },
  { city: 'Nagpur', aliases: ['orange city'], state: 'Maharashtra', hub: 'MIHAN / Multi-Modal Zero Mile Hub' },
  { city: 'Nashik', aliases: ['nasik'], state: 'Maharashtra', hub: 'Ambad / Satpur MIDC' },
  { city: 'Chhatrapati Sambhajinagar', aliases: ['aurangabad', 'waluj', 'shendra'], state: 'Maharashtra', hub: 'Waluj / Shendra DMIC' },
  { city: 'Aurangabad', aliases: ['sambhajinagar', 'waluj'], state: 'Maharashtra', hub: 'Waluj MIDC / Railway Hub' },
  { city: 'Kolhapur', aliases: ['shiroli', 'gokul shirgaon'], state: 'Maharashtra', hub: 'Foundry & Auto Cluster' },
  { city: 'Solapur', aliases: ['sholapur'], state: 'Maharashtra', hub: 'Textile & South Maharashtra Hub' },
  { city: 'Jalgaon', aliases: ['khandesh'], state: 'Maharashtra', hub: 'MIDC Industrial Hub' },
  { city: 'Ahmednagar', aliases: ['nagar'], state: 'Maharashtra', hub: 'MIDC Auto Spares Hub' },
  { city: 'Amravati', aliases: ['badnera'], state: 'Maharashtra', hub: 'Vidarbha Industrial Hub' },
  { city: 'Akola', aliases: ['cotton hub'], state: 'Maharashtra', hub: 'Cotton & Pulse Trading Hub' },
  { city: 'Chandrapur', aliases: ['coal city'], state: 'Maharashtra', hub: 'Thermal & Cement Corridor' },

  // Gujarat
  { city: 'Ahmedabad', aliases: ['ahmedabad city', 'aslali', 'sanand'], state: 'Gujarat', hub: 'Aslali / Changodar / Sanand GIDC' },
  { city: 'Surat', aliases: ['sachin', 'hazira'], state: 'Gujarat', hub: 'Sachin / Pandesara GIDC & Hazira Port' },
  { city: 'Vadodara', aliases: ['baroda', 'makarpura'], state: 'Gujarat', hub: 'Makarpura GIDC / Por Ramangamdi' },
  { city: 'Rajkot', aliases: ['shapar', 'metoda'], state: 'Gujarat', hub: 'Shapar / Aji GIDC Industrial Area' },
  { city: 'Gandhidham', aliases: ['kandla', 'mundra'], state: 'Gujarat', hub: 'Kandla / Mundra Port Gateway' },
  { city: 'Mundra', aliases: ['mundra port'], state: 'Gujarat', hub: 'APSEZ Mega Port & Terminal' },
  { city: 'Vapi', aliases: ['valsad vapi'], state: 'Gujarat', hub: 'Chemical & Industrial Zone' },
  { city: 'Ankleshwar', aliases: ['bharuch'], state: 'Gujarat', hub: 'GIDC Industrial Corridor' },
  { city: 'Bharuch', aliases: ['dahej'], state: 'Gujarat', hub: 'Dahej PCPIR & Port Corridor' },
  { city: 'Morbi', aliases: ['ceramic city'], state: 'Gujarat', hub: 'Ceramic Industrial Zone' },
  { city: 'Bhavnagar', aliases: ['alang'], state: 'Gujarat', hub: 'Shipbreaking & Rolling Mill Hub' },
  { city: 'Jamnagar', aliases: ['refinery hub'], state: 'Gujarat', hub: 'Petrochemical & Brass Parts Hub' },
  { city: 'Anand', aliases: ['amul city'], state: 'Gujarat', hub: 'Dairy & Engineering Hub' },

  // West Bengal & Eastern India
  { city: 'Kolkata', aliases: ['calcutta', 'dankuni'], state: 'West Bengal', hub: 'Dankuni Freight Terminal / Howrah Port' },
  { city: 'Howrah', aliases: ['dhulagarh'], state: 'West Bengal', hub: 'Kona Expressway / Dhulagarh Hub' },
  { city: 'Siliguri', aliases: ['north bengal'], state: 'West Bengal', hub: 'North Bengal & Sikkim Logistics Corridor' },
  { city: 'Durgapur', aliases: ['steel city'], state: 'West Bengal', hub: 'Industrial & Foundry Hub' },
  { city: 'Asansol', aliases: ['raniganj'], state: 'West Bengal', hub: 'Coal & Mineral Belt Hub' },
  { city: 'Haldia', aliases: ['haldia port'], state: 'West Bengal', hub: 'Port & Petrochemical Hub' },
  { city: 'Kharagpur', aliases: ['tata nagar line'], state: 'West Bengal', hub: 'Railway & Industrial Terminal' },

  // Tamil Nadu
  { city: 'Chennai', aliases: ['madras', 'madhavaram'], state: 'Tamil Nadu', hub: 'Madhavaram / Sriperumbudur / Ennore' },
  { city: 'Coimbatore', aliases: ['kovai'], state: 'Tamil Nadu', hub: 'SIDCO / Eachanari Transport Hub' },
  { city: 'Madurai', aliases: ['temple city'], state: 'Tamil Nadu', hub: 'Kappalur Industrial Estate' },
  { city: 'Tiruppur', aliases: ['tirupur'], state: 'Tamil Nadu', hub: 'Textile & Knitwear Export Hub' },
  { city: 'Salem', aliases: ['steel city'], state: 'Tamil Nadu', hub: 'Steel City / Autonagar' },
  { city: 'Tiruchirappalli', aliases: ['trichy'], state: 'Tamil Nadu', hub: 'BHEL Heavy Engineering Cluster' },
  { city: 'Hosur', aliases: ['bangalore border'], state: 'Tamil Nadu', hub: 'SIPCOT Industrial Park' },
  { city: 'Thoothukudi', aliases: ['tuticorin'], state: 'Tamil Nadu', hub: 'VOC Port & Thermal Corridor' },
  { city: 'Erode', aliases: ['turmeric city'], state: 'Tamil Nadu', hub: 'Perundurai SIPCOT' },

  // Telangana & Andhra Pradesh
  { city: 'Hyderabad', aliases: ['secunderabad', 'cyberabad'], state: 'Telangana', hub: 'Shamshabad / Medchal / Auto Nagar' },
  { city: 'Secunderabad', aliases: ['hyderabad'], state: 'Telangana', hub: 'Bowenpally Transport Zone' },
  { city: 'Warangal', aliases: ['tri-city'], state: 'Telangana', hub: 'Textile & Granites Hub' },
  { city: 'Visakhapatnam', aliases: ['vizag'], state: 'Andhra Pradesh', hub: 'Vizag Port / Gajuwaka / Autonagar' },
  { city: 'Vijayawada', aliases: ['bezawada'], state: 'Andhra Pradesh', hub: 'Autonagar Transport Hub' },
  { city: 'Guntur', aliases: ['chilli city'], state: 'Andhra Pradesh', hub: 'Autonagar / Tobacco & Agri Hub' },
  { city: 'Nellore', aliases: ['krishnapatnam'], state: 'Andhra Pradesh', hub: 'Port Corridor' },
  { city: 'Tirupati', aliases: ['renigunta'], state: 'Andhra Pradesh', hub: 'EMC Electronics Cluster' },
  { city: 'Kurnool', aliases: ['cement corridor'], state: 'Andhra Pradesh', hub: 'Mineral & Cement Hub' },

  // Rajasthan
  { city: 'Jaipur', aliases: ['pink city', 'vkia'], state: 'Rajasthan', hub: 'VKIA / Transport Nagar / Bagru' },
  { city: 'Jodhpur', aliases: ['sun city'], state: 'Rajasthan', hub: 'Basni / Boranada SEZ' },
  { city: 'Udaipur', aliases: ['lake city'], state: 'Rajasthan', hub: 'Sukher / Madri Industrial Area' },
  { city: 'Kota', aliases: ['chambal'], state: 'Rajasthan', hub: 'Ranpur Industrial Area' },
  { city: 'Bhilwara', aliases: ['textile city'], state: 'Rajasthan', hub: 'Textile & Synthetic Transport Hub' },
  { city: 'Kishangarh', aliases: ['ajmer'], state: 'Rajasthan', hub: 'Marble City & Highway Hub' },
  { city: 'Alwar', aliases: ['matsya'], state: 'Rajasthan', hub: 'Matsya Industrial Area' },
  { city: 'Bhiwadi', aliases: ['khushkhera'], state: 'Rajasthan', hub: 'RIICO Industrial Area' },
  { city: 'Neemrana', aliases: ['japanese zone'], state: 'Rajasthan', hub: 'Japanese Industrial Zone / NH-48' },
  { city: 'Bikaner', aliases: ['thar'], state: 'Rajasthan', hub: 'Agri-Processing & Wool Hub' },

  // Uttar Pradesh
  { city: 'Lucknow', aliases: ['nawabs city'], state: 'Uttar Pradesh', hub: 'Transport Nagar / Sarojini Nagar' },
  { city: 'Kanpur', aliases: ['leather city'], state: 'Uttar Pradesh', hub: 'Co-operative Estate / Panki Hub' },
  { city: 'Agra', aliases: ['taj city'], state: 'Uttar Pradesh', hub: 'Transport Nagar / Sikandra' },
  { city: 'Varanasi', aliases: ['banaras', 'kashi'], state: 'Uttar Pradesh', hub: 'Ring Road Transport Hub' },
  { city: 'Prayagraj', aliases: ['allahabad'], state: 'Uttar Pradesh', hub: 'Naini / Allahabad Bypass' },
  { city: 'Meerut', aliases: ['sports city'], state: 'Uttar Pradesh', hub: 'Partapur Bypass / TPT Nagar' },
  { city: 'Bareilly', aliases: ['cb ganj'], state: 'Uttar Pradesh', hub: 'CB Ganj / Parsakhera' },
  { city: 'Moradabad', aliases: ['brass city'], state: 'Uttar Pradesh', hub: 'Brass City Industrial Area' },
  { city: 'Gorakhpur', aliases: ['gida'], state: 'Uttar Pradesh', hub: 'GIDA Industrial Area' },
  { city: 'Aligarh', aliases: ['lock city'], state: 'Uttar Pradesh', hub: 'Tala Nagari / GT Road' },
  { city: 'Noida', aliases: ['greater noida'], state: 'Uttar Pradesh', hub: 'Greater Noida / Expressway Hub' },
  { city: 'Ghaziabad', aliases: ['sahibabad'], state: 'Uttar Pradesh', hub: 'Loni / Sahibabad Industrial Area' },
  { city: 'Mathura', aliases: ['refinery'], state: 'Uttar Pradesh', hub: 'Refinery Industrial Hub' },
  { city: 'Ayodhya', aliases: ['faizabad'], state: 'Uttar Pradesh', hub: 'NH-27 Highway Logistics Junction' },

  // Punjab, Chandigarh, Himachal & J&K
  { city: 'Chandigarh', aliases: ['tricity', 'mohali', 'panchkula'], state: 'Chandigarh', hub: 'Industrial Area Phase 1 & 2' },
  { city: 'Ludhiana', aliases: ['manchester of india'], state: 'Punjab', hub: 'Transport Nagar / Dhandari Kalan Dry Port' },
  { city: 'Amritsar', aliases: ['golden city'], state: 'Punjab', hub: 'GT Road / Focal Point' },
  { city: 'Jalandhar', aliases: ['sports city'], state: 'Punjab', hub: 'Transport Nagar / Focal Point' },
  { city: 'Bathinda', aliases: ['bhatinda'], state: 'Punjab', hub: 'Thermal & Petrochemical Hub' },
  { city: 'Baddi', aliases: ['solan'], state: 'Himachal Pradesh', hub: 'Pharma & Manufacturing Cluster' },
  { city: 'Shimla', aliases: ['simla'], state: 'Himachal Pradesh', hub: 'Hill Freight Station' },
  { city: 'Jammu', aliases: ['narwal'], state: 'Jammu & Kashmir', hub: 'Transport Nagar Narwal' },
  { city: 'Srinagar', aliases: ['parimpora'], state: 'Jammu & Kashmir', hub: 'Parimpora Transport Nagar' },

  // Madhya Pradesh & Chhattisgarh
  { city: 'Indore', aliases: ['pithampur', 'dewas'], state: 'Madhya Pradesh', hub: 'Loha Mandi / Dewas Naka / Pithampur' },
  { city: 'Bhopal', aliases: ['mandideep'], state: 'Madhya Pradesh', hub: 'Govindpura / Mandideep Industrial' },
  { city: 'Gwalior', aliases: ['malanpur'], state: 'Madhya Pradesh', hub: 'Transport Nagar / Malanpur' },
  { city: 'Jabalpur', aliases: ['richhai'], state: 'Madhya Pradesh', hub: 'Richhai Industrial Area' },
  { city: 'Raipur', aliases: ['rawabhata'], state: 'Chhattisgarh', hub: 'Rawabhata / Bhanpuri Transport Nagar' },
  { city: 'Bilaspur', aliases: ['sirgitti'], state: 'Chhattisgarh', hub: 'Sirgitti / Tifra Industrial' },

  // Bihar & Jharkhand
  { city: 'Patna', aliases: ['bihta'], state: 'Bihar', hub: 'Transport Nagar / Bihta Dry Port' },
  { city: 'Muzaffarpur', aliases: ['bela'], state: 'Bihar', hub: 'Bela Industrial Area' },
  { city: 'Gaya', aliases: ['dobhi'], state: 'Bihar', hub: 'Dobhi GT Road Junction' },
  { city: 'Bhagalpur', aliases: ['silk city'], state: 'Bihar', hub: 'Barari Industrial Area' },
  { city: 'Purnia', aliases: ['purnea'], state: 'Bihar', hub: 'Eastern Highway Junction' },
  { city: 'Ranchi', aliases: ['tupudana'], state: 'Jharkhand', hub: 'Tupudana / Namkum Industrial Area' },
  { city: 'Jamshedpur', aliases: ['tatanagar', 'adityapur'], state: 'Jharkhand', hub: 'Gamharia / Adityapur Industrial Area' },
  { city: 'Dhanbad', aliases: ['coal capital', 'govindpur'], state: 'Jharkhand', hub: 'Govindpur GT Road Hub' },
  { city: 'Bokaro', aliases: ['steel city'], state: 'Jharkhand', hub: 'Steel City Industrial Hub' },

  // Odisha, Kerala, Assam & North East
  { city: 'Bhubaneswar', aliases: ['smart city'], state: 'Odisha', hub: 'Mancheswar / Rasulgarh' },
  { city: 'Cuttack', aliases: ['jagatpur'], state: 'Odisha', hub: 'Jagatpur Industrial Estate' },
  { city: 'Rourkela', aliases: ['steel city'], state: 'Odisha', hub: 'Steel City Hub' },
  { city: 'Kochi', aliases: ['cochin', 'ernakulam'], state: 'Kerala', hub: 'Willingdon Island / Kalamassery' },
  { city: 'Thiruvananthapuram', aliases: ['trivandrum'], state: 'Kerala', hub: 'Kazhakkoottam / Kochuveli' },
  { city: 'Kozhikode', aliases: ['calicut'], state: 'Kerala', hub: 'Feroke / Beypore Port' },
  { city: 'Guwahati', aliases: ['gauhati'], state: 'Assam', hub: 'ISBT / Betkuchi / North East Gateway' },
  { city: 'Silchar', aliases: ['barak valley'], state: 'Assam', hub: 'Southern Assam Logistics Link' },
  { city: 'Dehradun', aliases: ['doon'], state: 'Uttarakhand', hub: 'Transport Nagar / Patel Nagar' },
  { city: 'Haridwar', aliases: ['sidcul'], state: 'Uttarakhand', hub: 'SIDCUL Industrial Area' },
  { city: 'Rudrapur', aliases: ['pantnagar'], state: 'Uttarakhand', hub: 'SIDCUL Auto & Logistics Hub' },
  { city: 'Goa', aliases: ['panaji', 'margao', 'vasco'], state: 'Goa', hub: 'Verna Industrial Estate / Mormugao Port' },
];

export default function CitySearchInput({
  value = '',
  onChange,
  placeholder = 'Type to search any Indian city, town, or site...',
  label,
  required = false,
  isDark = false,
  branches = [],
  customers = [],
  className = '',
  accentColor = 'indigo', // 'indigo' | 'blue'
}) {
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [coords, setCoords] = useState({ top: 0, bottom: undefined, left: 0, width: 0, openUp: false });
  const [mounted, setMounted] = useState(false);

  // Live Map Results state
  const [liveResults, setLiveResults] = useState([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Synchronize internal query with external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Combine static Indian cities with user's branch cities and customer cities
  const allLocations = useMemo(() => {
    const map = new Map();

    // 1. Add branch cities first (priority)
    if (Array.isArray(branches)) {
      branches.forEach((b) => {
        const c = (b.city || b.branch_name || '').trim();
        if (c && !map.has(c.toLowerCase())) {
          map.set(c.toLowerCase(), {
            city: c,
            aliases: [c.toLowerCase()],
            state: b.state || 'Company Branch',
            hub: `[${b.branch_code || 'HUB'}] ${b.branch_name || 'Branch'}`,
            isBranch: true,
          });
        }
      });
    }

    // 2. Add customer cities
    if (Array.isArray(customers)) {
      customers.forEach((cust) => {
        const c = (cust.city || '').trim();
        if (c && !map.has(c.toLowerCase())) {
          map.set(c.toLowerCase(), {
            city: c,
            aliases: [c.toLowerCase()],
            state: cust.state || 'Customer City',
            hub: cust.company_name ? `Client: ${cust.company_name}` : 'Customer Location',
            isCustomer: true,
          });
        }
      });
    }

    // 3. Add comprehensive national logistics database
    INDIAN_LOGISTICS_CITIES.forEach((item) => {
      const key = item.city.toLowerCase();
      if (!map.has(key)) {
        map.set(key, item);
      }
    });

    return Array.from(map.values());
  }, [branches, customers]);

  // Filter offline database items based on user typing (matches city name, aliases, state, hub)
  const offlineFilteredList = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) {
      return allLocations.slice(0, 8);
    }

    const matches = [];
    for (const item of allLocations) {
      const cityLower = item.city.toLowerCase();
      const stateLower = (item.state || '').toLowerCase();
      const hubLower = (item.hub || '').toLowerCase();
      const aliases = item.aliases || [];

      let score = 0;
      if (cityLower.startsWith(q)) {
        score = 4;
      } else if (aliases.some((a) => a.startsWith(q))) {
        score = 3.5;
      } else if (cityLower.includes(q)) {
        score = 3;
      } else if (aliases.some((a) => a.includes(q))) {
        score = 2.5;
      } else if (stateLower.includes(q) || hubLower.includes(q)) {
        score = 1;
      }

      if (score > 0) {
        matches.push({ item, score });
      }

      if (matches.length >= 25) break;
    }

    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, 10).map((m) => m.item);
  }, [query, allLocations]);

  // Live Map Search via free OpenStreetMap Photon / Nominatim API
  const fetchLivePlaces = useCallback(async (searchTxt) => {
    const cleanQ = (searchTxt || '').trim();
    if (cleanQ.length < 3) {
      setLiveResults([]);
      setIsSearchingLive(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearchingLive(true);
    try {
      // 1. Try free OpenStreetMap Photon API (sub-50ms, CORS friendly, high accuracy for India)
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=8&countrycode=in`;
      const res = await fetch(photonUrl, { signal: abortControllerRef.current.signal });
      
      if (res.ok) {
        const json = await res.json();
        const items = [];
        const seenNames = new Set();

        (json.features || []).forEach((feat) => {
          const props = feat.properties || {};
          const name = props.name || props.city || props.town || props.village || props.county || '';
          const state = props.state || '';
          const district = props.district || props.county || '';
          const postcode = props.postcode ? ` - ${props.postcode}` : '';

          if (name && !seenNames.has(name.toLowerCase())) {
            seenNames.add(name.toLowerCase());
            const displayTitle = name;
            const subtitle = [district, state, props.country || 'India'].filter(Boolean).join(', ') + postcode;
            items.push({
              city: name,
              state: state || 'India',
              hub: subtitle,
              isLive: true,
            });
          }
        });

        setLiveResults(items.slice(0, 8));
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Silently fallback if network fails
        setLiveResults([]);
      }
    } finally {
      setIsSearchingLive(false);
    }
  }, []);

  // Debounced trigger for live map search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLivePlaces(query);
    }, 280);

    return () => clearTimeout(timer);
  }, [query, fetchLivePlaces]);

  // Combined Results (Offline curated + Live map places, deduplicated)
  const combinedList = useMemo(() => {
    const list = [...offlineFilteredList];
    const seen = new Set(list.map((item) => item.city.toLowerCase()));

    liveResults.forEach((liveItem) => {
      if (!seen.has(liveItem.city.toLowerCase())) {
        seen.add(liveItem.city.toLowerCase());
        list.push(liveItem);
      }
    });

    return list;
  }, [offlineFilteredList, liveResults]);

  // Check if current query is already an exact match in the combined list
  const hasExactMatch = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return true;
    return combinedList.some((item) => item.city.toLowerCase() === q);
  }, [query, combinedList]);

  // Calculate viewport coordinates so it portals above all modals without clipping
  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If there is less than 250px below, but more space above, open upwards
      const openUp = spaceBelow < 250 && spaceAbove > spaceBelow;

      setCoords({
        top: openUp ? undefined : rect.bottom + 6,
        bottom: openUp ? window.innerHeight - rect.top + 6 : undefined,
        left: Math.max(8, rect.left),
        width: Math.min(rect.width, window.innerWidth - 16),
        openUp,
      });
    }
  };

  // Close dropdown when clicked outside and handle reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleReposition = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen]);

  const handleSelect = (cityName) => {
    setQuery(cityName);
    if (onChange) onChange(cityName);
    setIsOpen(false);
  };

  const handleCustomAdd = () => {
    const custom = query.trim();
    if (custom) {
      handleSelect(custom);
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        updatePosition();
        setIsOpen(true);
      }
      return;
    }

    const totalOptions = combinedList.length + (!hasExactMatch && query.trim() ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (totalOptions || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalOptions) % (totalOptions || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!hasExactMatch && query.trim() && highlightedIndex === 0) {
        handleCustomAdd();
      } else {
        const offset = !hasExactMatch && query.trim() ? 1 : 0;
        const target = combinedList[highlightedIndex - offset];
        if (target) {
          handleSelect(target.city);
        } else if (query.trim()) {
          handleCustomAdd();
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const clearInput = (e) => {
    e.stopPropagation();
    setQuery('');
    if (onChange) onChange('');
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {label} {required && <span className="text-red-500 font-bold ml-0.5">*</span>}
        </label>
      )}

      {/* Input container */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <MapPin className={`w-4 h-4 ${accentColor === 'indigo' ? 'text-indigo-500' : 'text-blue-500'}`} />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          required={required}
          placeholder={placeholder}
          onFocus={() => {
            updatePosition();
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onChange) onChange(e.target.value);
            updatePosition();
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-xs font-semibold transition-all focus:outline-hidden ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50'
              : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30'
          }`}
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1.5">
          {isSearchingLive && (
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin shrink-0" />
          )}
          {query && (
            <button
              type="button"
              onClick={clearInput}
              tabIndex={-1}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Portal Autocomplete Dropdown - NEVER clipped by any modal container */}
      {isOpen && mounted && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: coords.top !== undefined ? `${coords.top}px` : undefined,
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            zIndex: 99999,
          }}
          className={`max-h-72 overflow-y-auto rounded-xl border shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150 ${
            isDark
              ? 'bg-slate-900/98 border-slate-700 shadow-black/80 divide-y divide-slate-800'
              : 'bg-white/98 border-slate-200 shadow-slate-400/40 divide-y divide-slate-100'
          }`}
        >
          {/* Header indicator */}
          <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between sticky top-0 z-10 ${
            isDark ? 'bg-slate-950/95 text-slate-400 border-b border-slate-800' : 'bg-slate-50/95 text-slate-500 border-b border-slate-100'
          }`}>
            <span className="flex items-center gap-1.5">
              <span>{query ? `Cities matching "${query}"` : 'Popular Logistics Hubs'}</span>
              {isSearchingLive && (
                <span className="text-[9px] font-normal text-indigo-500 lowercase flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" /> searching map...
                </span>
              )}
            </span>
            <span className="text-[9px] font-normal lowercase opacity-70">click or press enter</span>
          </div>

          {/* Option: Use Custom Typed City if not matching exactly */}
          {!hasExactMatch && query.trim() && (
            <div
              onClick={handleCustomAdd}
              onMouseEnter={() => setHighlightedIndex(0)}
              className={`p-2.5 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                highlightedIndex === 0
                  ? isDark
                    ? 'bg-indigo-950/70 text-indigo-300'
                    : 'bg-indigo-50 text-indigo-700 font-bold'
                  : isDark
                  ? 'hover:bg-slate-800/60 text-indigo-400'
                  : 'hover:bg-indigo-50/50 text-indigo-600'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-md bg-indigo-500/15 flex items-center justify-center shrink-0 text-indigo-500">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <span className="font-bold">Use &quot;{query.trim()}&quot;</span>
                  <span className="text-[10px] block opacity-75">Add custom destination site or yard</span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-500 shrink-0">
                Custom Site
              </span>
            </div>
          )}

          {/* Suggested List (Offline Database + Live OpenStreetMap places) */}
          <div className="py-1">
            {combinedList.length > 0 ? (
              combinedList.map((item, idx) => {
                const adjustedIdx = !hasExactMatch && query.trim() ? idx + 1 : idx;
                const isSelected = (value || '').toLowerCase().trim() === item.city.toLowerCase().trim();
                const isHighlighted = highlightedIndex === adjustedIdx;

                return (
                  <div
                    key={`${item.city}-${item.state}-${idx}`}
                    onClick={() => handleSelect(item.city)}
                    onMouseEnter={() => setHighlightedIndex(adjustedIdx)}
                    className={`px-3 py-2 text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isHighlighted
                        ? isDark
                          ? 'bg-blue-600/25 text-white'
                          : 'bg-indigo-50/90 text-indigo-900 font-bold'
                        : isDark
                        ? 'hover:bg-slate-800/50 text-slate-200'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.isBranch ? (
                        <div className="w-6 h-6 rounded-md bg-cyan-500/15 text-cyan-500 flex items-center justify-center shrink-0">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                      ) : item.isLive ? (
                        <div className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                          <Globe2 className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-slate-500/10 text-slate-400 flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {item.city}
                          </span>
                          {item.state && (
                            <span className="text-[10px] text-slate-400 truncate">
                              ({item.state})
                            </span>
                          )}
                        </div>
                        {item.hub && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {item.hub}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isBranch ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                          Our Branch
                        </span>
                      ) : item.isLive ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Live Map
                        </span>
                      ) : null}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                {isSearchingLive ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                    Searching live map for &quot;{query}&quot;...
                  </span>
                ) : (
                  <span>No matching cities found. Use the option above to add &quot;{query}&quot;.</span>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
