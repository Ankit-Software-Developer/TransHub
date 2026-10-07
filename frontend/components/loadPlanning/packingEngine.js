// frontend/components/loadPlanning/packingEngine.js

/**
 * Dimensions (in meters) for standard commercial truck sizes (India & International)
 */
export const TRUCK_CONFIGS = {
  '11FT': {
    name: '11 Feet Truck',
    feet: 11,
    tonnage: 3.5,
    length: 3.4,  // cargo length (meters)
    width: 1.8,   // cargo width
    height: 1.9,  // cargo height
    cabLength: 1.3,
    axleCount: 2, // 1 front, 1 rear
    wheelbase: 2.5,
    rearOverhang: 0.9,
    cabType: 'COE_COMPACT',
    defaultCapacityKg: 3500,
    volumeM3: 11.6,
  },
  '14FT': {
    name: '14 Feet Truck',
    feet: 14,
    tonnage: 5.5,
    length: 4.3,
    width: 2.0,
    height: 2.1,
    cabLength: 1.4,
    axleCount: 2,
    wheelbase: 3.2,
    rearOverhang: 1.1,
    cabType: 'ICV_STANDARD',
    defaultCapacityKg: 5500,
    volumeM3: 18.0,
  },
  '19FT': {
    name: '19 Feet Truck',
    feet: 19,
    tonnage: 9.5,
    length: 5.8,
    width: 2.2,
    height: 2.3,
    cabLength: 1.6,
    axleCount: 2, // 1 front, 1 rear dual-tire
    wheelbase: 4.3,
    rearOverhang: 1.4,
    cabType: 'MEDIUM_DEFLECTOR',
    defaultCapacityKg: 9500,
    volumeM3: 29.3,
  },
  '24FT': {
    name: '24 Feet Truck',
    feet: 24,
    tonnage: 16.0,
    length: 7.4,
    width: 2.3,
    height: 2.4,
    cabLength: 1.8,
    axleCount: 3, // 1 front, 2 tandem rear
    wheelbase: 5.2,
    rearOverhang: 1.6,
    cabType: 'HEAVY_DUTY',
    defaultCapacityKg: 16000,
    volumeM3: 40.8,
  },
  '32FT': {
    name: '32 Feet Truck',
    feet: 32,
    tonnage: 28.0,
    length: 9.8,
    width: 2.4,
    height: 2.6,
    cabLength: 2.0,
    axleCount: 4, // 1 front, 3 multi-axle rear
    wheelbase: 6.8,
    rearOverhang: 1.8,
    cabType: 'TRAILER_SLEEPER',
    defaultCapacityKg: 28000,
    volumeM3: 61.1,
  },
};

/**
 * Maps vehicle capacity / type to closest standard truck configuration
 */
export function getTruckConfigForVehicle(vehicle, explicitFeet = null) {
  if (explicitFeet && TRUCK_CONFIGS[explicitFeet]) {
    return { ...TRUCK_CONFIGS[explicitFeet], key: explicitFeet };
  }

  if (!vehicle) {
    return { ...TRUCK_CONFIGS['19FT'], key: '19FT' };
  }

  const ton = parseFloat(vehicle.capacity_ton || 0);
  const typeStr = (vehicle.vehicle_type || '').toUpperCase();

  if (ton >= 20 || typeStr.includes('TRAILER') || typeStr.includes('32')) {
    return { ...TRUCK_CONFIGS['32FT'], key: '32FT' };
  }
  if (ton >= 13 || typeStr.includes('TAURUS') || typeStr.includes('24') || typeStr.includes('MULTI_AXLE')) {
    return { ...TRUCK_CONFIGS['24FT'], key: '24FT' };
  }
  if (ton >= 7 || typeStr.includes('19') || typeStr.includes('EICHER')) {
    return { ...TRUCK_CONFIGS['19FT'], key: '19FT' };
  }
  if (ton >= 4 || typeStr.includes('14') || typeStr.includes('ICV')) {
    return { ...TRUCK_CONFIGS['14FT'], key: '14FT' };
  }
  return { ...TRUCK_CONFIGS['11FT'], key: '11FT' };
}

/**
 * Dynamic 3D Volumetric Box Packing Algorithm
 * Scales box sizes dynamically so large counts pack tightly and small counts fill realistically.
 */
export function computeVolumetricPacking(truckConfig, loadedItems = []) {
  const containerL = truckConfig.length;
  const containerW = truckConfig.width;
  const containerH = truckConfig.height;

  // Calculate total individual packages across all selected consignments
  const totalPackages = loadedItems.reduce((acc, item) => acc + (parseInt(item.packages, 10) || 1), 0);

  if (totalPackages === 0) {
    return {
      boxes: [],
      stats: {
        totalPackages: 0,
        boxUnitDimensions: { width: 0, height: 0, depth: 0 },
        floorUtilizationPct: 0,
        volumeUtilizationPct: 0,
        axleBalanceFrontPct: 50,
        axleBalanceRearPct: 50,
        isFull: false,
      },
    };
  }

  // Dynamic box sizing:
  // As the truck gets fuller, box dimensions scale smaller to fit realistically without overflowing
  let targetCols, targetTiers; // across width (W), height (H)
  if (totalPackages <= 12) {
    targetCols = 2;
    targetTiers = 2;
  } else if (totalPackages <= 36) {
    targetCols = 3;
    targetTiers = 3;
  } else if (totalPackages <= 80) {
    targetCols = 4;
    targetTiers = 4;
  } else if (totalPackages <= 150) {
    targetCols = 5;
    targetTiers = 5;
  } else {
    targetCols = 6;
    targetTiers = 6;
  }

  // Margin inside container to avoid clipping container walls
  const marginW = 0.08;
  const marginH = 0.08;
  const marginL = 0.12;

  const usableW = containerW - marginW * 2;
  const usableH = containerH - marginH * 2;
  const usableL = containerL - marginL * 2;

  const boxW = (usableW / targetCols) * 0.94;
  const boxH = (usableH / targetTiers) * 0.94;
  
  // Calculate depth based on total packages
  const packagesPerCrossSection = targetCols * targetTiers;
  const neededRows = Math.ceil(totalPackages / packagesPerCrossSection);
  
  // If needed rows would exceed container length, scale box size down dynamically
  let boxD = Math.min((usableL / Math.max(neededRows, 1)) * 0.92, boxW * 1.1);
  if (neededRows * (boxD + 0.02) > usableL) {
    boxD = (usableL / neededRows) * 0.9;
  }

  // Spacing between boxes
  const gapW = (usableW - targetCols * boxW) / Math.max(targetCols - 1, 1);
  const gapH = (usableH - targetTiers * boxH) / Math.max(targetTiers - 1, 1);
  const gapD = 0.02;

  const boxes = [];
  let currentPackageGlobalIndex = 0;

  // Staged consignments loaded from FRONT (closest to cabin) towards REAR (loading doors)
  // X = Width [-usableW/2 to +usableW/2]
  // Y = Height [0 to usableH]
  // Z = Length [-usableL/2 (front/cab) to +usableL/2 (rear/door)]
  const startZ = -usableL / 2 + boxD / 2;
  const startX = -usableW / 2 + boxW / 2;
  const startY = boxH / 2;

  loadedItems.forEach((docket, docketIndex) => {
    const pkgCount = parseInt(docket.packages, 10) || 1;

    for (let p = 0; p < pkgCount; p++) {
      const crossIndex = currentPackageGlobalIndex % packagesPerCrossSection;
      const rowIndex = Math.floor(currentPackageGlobalIndex / packagesPerCrossSection);

      const colIndex = crossIndex % targetCols;
      const tierIndex = Math.floor(crossIndex / targetCols);

      const posX = startX + colIndex * (boxW + gapW);
      const posY = startY + tierIndex * (boxH + gapH);
      const posZ = startZ + rowIndex * (boxD + gapD);

      boxes.push({
        id: `${docket.id}-pkg-${p}`,
        docketId: docket.id,
        docketNumber: docket.docket_number,
        docketIndex,
        pkgIndex: p + 1,
        totalInDocket: pkgCount,
        color: docket.color || '#00F0FF',
        position: [posX, posY, posZ],
        dimensions: [boxW, boxH, boxD],
        shipper: docket.shipper,
        receiver: docket.receiver,
        destination: docket.destination,
        weightKg: docket.weight_kg ? (docket.weight_kg / pkgCount).toFixed(0) : '40',
        order: currentPackageGlobalIndex,
      });

      currentPackageGlobalIndex++;
    }
  });

  // Calculate Center of Gravity (Axle Load Balancing)
  // front of container = -usableL / 2, rear = +usableL / 2
  let sumZ = 0;
  boxes.forEach((b) => {
    sumZ += b.position[2];
  });
  const avgZ = boxes.length > 0 ? sumZ / boxes.length : 0;
  // Normalized to -1 (pure front) to +1 (pure rear)
  const normalizedZ = avgZ / (usableL / 2 || 1);
  const rearPct = Math.round(Math.min(Math.max(50 + normalizedZ * 30, 20), 80));
  const frontPct = 100 - rearPct;

  const totalLoadedBoxVolume = boxes.reduce((acc, b) => acc + (b.dimensions[0] * b.dimensions[1] * b.dimensions[2]), 0);
  const totalContainerVolume = containerL * containerW * containerH;
  const volumeUtilizationPct = Math.min(Math.round((totalLoadedBoxVolume / totalContainerVolume) * 100), 100);

  // Floor utilization
  const totalFloorFootprint = (neededRows * boxD * targetCols * boxW);
  const floorArea = containerL * containerW;
  const floorUtilizationPct = Math.min(Math.round((totalFloorFootprint / floorArea) * 100), 100);

  return {
    boxes,
    stats: {
      totalPackages,
      boxUnitDimensions: {
        width: parseFloat(boxW.toFixed(2)),
        height: parseFloat(boxH.toFixed(2)),
        depth: parseFloat(boxD.toFixed(2)),
      },
      floorUtilizationPct,
      volumeUtilizationPct,
      axleBalanceFrontPct: frontPct,
      axleBalanceRearPct: rearPct,
      isFull: volumeUtilizationPct >= 90 || neededRows * boxD >= usableL * 0.95,
    },
  };
}
