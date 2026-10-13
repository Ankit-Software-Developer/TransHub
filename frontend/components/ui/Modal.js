// frontend/components/ui/Modal.js
'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Enterprise Production-Grade Modal Component
 * 
 * Features:
 * - Direct React Portal mounting to document.body (breaks free of any flex / overflow stacking contexts)
 * - True 100vw x 100vh full-screen dark backdrop overlay covering top Navbar and Sidebar completely
 * - zIndex 99999 ensures modal and backdrop always sit above any sticky navigation headers
 * - Auto body scroll locking when opened
 * - ESC key dismissal support
 * - SSR-safe hydration guard
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  backdropClassName = 'bg-black/75 backdrop-blur-sm',
  containerClassName = 'p-3 sm:p-4 md:p-6',
  className = '',
  zIndex = 'z-[9999]',
  closeOnBackdropClick = true,
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndex} flex items-center justify-center ${containerClassName} overflow-y-auto animate-in fade-in duration-150`}
      style={{ zIndex: 99999 }}
    >
      {/* Full-screen Dark Backdrop Overlay covering 100% of entire application, navbar, and sidebar */}
      <div
        className={`fixed inset-0 ${backdropClassName} transition-opacity cursor-pointer`}
        style={{ zIndex: 99999 }}
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Modal Dialog Content Container */}
      <div
        className={`relative w-full flex justify-center ${className}`}
        style={{ zIndex: 100000 }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
