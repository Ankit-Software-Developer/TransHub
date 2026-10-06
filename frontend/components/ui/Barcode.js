'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function Barcode({
  value,
  width = 1.4,
  height = 32,
  displayValue = false,
  fontSize = 11,
  margin = 0,
  className = '',
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value), {
          format: 'CODE128',
          width,
          height,
          displayValue,
          fontSize,
          margin,
          background: 'transparent',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn('JsBarcode render error:', err);
      }
    }
  }, [value, width, height, displayValue, fontSize, margin]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={`mx-auto block ${className}`}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
