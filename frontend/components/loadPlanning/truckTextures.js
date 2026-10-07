// frontend/components/loadPlanning/truckTextures.js
import * as THREE from 'three';

const textureCache = new Map();

/**
 * Creates high-res procedural shipping carton texture with realistic kraft paper,
 * packaging tape, and thermal shipping label with barcode.
 */
export function getCardboardTexture(tintColorHex = '#38BDF8', docketNumber = 'LR-001', destination = 'Hub') {
  const cacheKey = `box-${tintColorHex}-${docketNumber}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 1. Realistic Kraft Cardboard Base
  ctx.fillStyle = '#C89D68'; // Warm corrugated kraft tone
  ctx.fillRect(0, 0, 512, 512);

  // Subtle paper grain noise
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let i = 0; i < 4000; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Corrugation subtle horizontal fluting lines
  ctx.strokeStyle = 'rgba(0,0,0,0.035)';
  ctx.lineWidth = 1;
  for (let y = 0; y < 512; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // 2. Colored Logistics Consignment Strapping / Tape (Docket Tint)
  ctx.fillStyle = tintColorHex;
  ctx.globalAlpha = 0.85;
  // Two vertical cargo straps
  ctx.fillRect(70, 0, 24, 512);
  ctx.fillRect(418, 0, 24, 512);
  ctx.globalAlpha = 1.0;

  // 3. Realistic Brown Box Packaging Tape across horizontal seam
  ctx.fillStyle = 'rgba(165, 105, 45, 0.72)';
  ctx.fillRect(0, 240, 512, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(0, 242, 512, 4); // glossy tape reflection

  // 4. Realistic White Thermal Shipping Label
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 6;
  ctx.fillRect(120, 110, 272, 175);
  ctx.shadowBlur = 0;

  // Label Header Bar
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(120, 110, 272, 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('TRANSHUB LOGISTICS', 132, 131);

  // Docket Number & Priority
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 20px monospace';
  ctx.fillText(docketNumber, 132, 168);

  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`DEST: ${destination.toUpperCase().slice(0, 14)}`, 132, 188);

  // Barcode Lines
  ctx.fillStyle = '#000000';
  let bx = 132;
  const barcodeY = 200;
  const barcodeH = 40;
  while (bx < 360) {
    const w = Math.random() > 0.4 ? 3 : 1.5;
    ctx.fillRect(bx, barcodeY, w, barcodeH);
    bx += w + (Math.random() > 0.5 ? 3 : 2);
  }

  // Fragile / This Side Up Icon
  ctx.fillStyle = '#DC2626';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('↑↑ FRAGILE', 132, 264);

  // Box Flap Edges / Shadows
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 508, 508);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates high-detail commercial truck radiator grille texture
 */
export function getTruckGrilleTexture(isDark = true) {
  const cacheKey = `grille-${isDark}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Dark Radiator Mesh Background
  ctx.fillStyle = '#0B0F19';
  ctx.fillRect(0, 0, 512, 256);

  // Honeycomb / Honeycomb Grid pattern
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.5;
  for (let x = 0; x < 512; x += 16) {
    for (let y = 0; y < 256; y += 16) {
      ctx.strokeRect(x, y, 12, 12);
    }
  }

  // Chrome Horizontal Louvers / Slats
  const gradient = ctx.createLinearGradient(0, 0, 512, 0);
  gradient.addColorStop(0, '#94A3B8');
  gradient.addColorStop(0.5, '#F8FAFC');
  gradient.addColorStop(1, '#94A3B8');

  ctx.fillStyle = gradient;
  for (let y = 40; y < 220; y += 38) {
    ctx.fillRect(30, y, 452, 10);
    // Bevel shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(30, y + 10, 452, 3);
    ctx.fillStyle = gradient;
  }

  // Central Chrome Emblem Wing
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.arc(256, 128, 32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0284C7';
  ctx.beginPath();
  ctx.arc(256, 128, 26, 0, Math.PI * 2);
  ctx.fill();

  // Chrome Star / Eagle Crest
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('T', 256, 129);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates heavy-duty commercial truck radial tire sidewall & rim texture
 */
export function getTireWheelTexture() {
  const cacheKey = 'tire-wheel';
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const cx = 256;
  const cy = 256;

  // Outer Black Rubber Tire Sidewall
  ctx.fillStyle = '#181A20';
  ctx.beginPath();
  ctx.arc(cx, cy, 250, 0, Math.PI * 2);
  ctx.fill();

  // Tire Brand & Specs Micro-emboss
  ctx.strokeStyle = '#282C34';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 215, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#3E4451';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('TRANSHUB RADIAL • 295/80 R22.5 • HEAVY HAUL', cx, 65);
  ctx.fillText('MAX LOAD 4000 KG • STEEL BELTED', cx, 465);

  // Chrome / Steel Deep-Dish Rim
  const rimGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 180);
  rimGrad.addColorStop(0, '#E2E8F0');
  rimGrad.addColorStop(0.7, '#CBD5E1');
  rimGrad.addColorStop(1, '#64748B');

  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 180, 0, Math.PI * 2);
  ctx.fill();

  // Dark Inner Rim Cutouts (Ventilation Holes)
  ctx.fillStyle = '#0F172A';
  const numHoles = 10;
  for (let i = 0; i < numHoles; i++) {
    const angle = (i * Math.PI * 2) / numHoles;
    const hx = cx + Math.cos(angle) * 115;
    const hy = cy + Math.sin(angle) * 115;
    ctx.beginPath();
    ctx.arc(hx, hy, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Central Axle Grease Hub Cap (Dark Cast Iron with Chrome Cap)
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(cx, cy, 65, 0, Math.PI * 2);
  ctx.fill();

  // 10 Chrome Lug Nuts
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI * 2) / 10;
    const nx = cx + Math.cos(angle) * 48;
    const ny = cy + Math.sin(angle) * 48;
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Center axle logo bolt
  ctx.fillStyle = '#0284C7';
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates rear underrun safety chevron reflective tape texture
 */
export function getRearChevronTexture() {
  const cacheKey = 'chevron';
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Alternating Red & Yellow 45-degree Safety Stripes
  ctx.fillStyle = '#FACC15'; // Fluorescent Highway Yellow
  ctx.fillRect(0, 0, 512, 64);

  ctx.fillStyle = '#DC2626'; // Highway Safety Red
  const stripeW = 32;
  for (let x = -64; x < 576; x += stripeW * 2) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + stripeW, 0);
    ctx.lineTo(x + stripeW + 40, 64);
    ctx.lineTo(x + 40, 64);
    ctx.closePath();
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates realistic wooden Euro-pallet texture
 */
export function getPalletWoodTexture() {
  const cacheKey = 'pallet-wood';
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Pine wood tone
  ctx.fillStyle = '#D4A373';
  ctx.fillRect(0, 0, 256, 256);

  // Wood grain stripes
  ctx.strokeStyle = 'rgba(100, 60, 20, 0.15)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(y * 0.1) * 3);
    ctx.lineTo(256, y + Math.cos(y * 0.1) * 3);
    ctx.stroke();
  }

  // Dark plank separation grooves
  ctx.fillStyle = '#583101';
  ctx.fillRect(0, 80, 256, 4);
  ctx.fillRect(0, 168, 256, 4);

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set(cacheKey, texture);
  return texture;
}
