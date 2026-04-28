'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Tenant {
  id: string;
  name: string;
  brandName?: string | null;
  primaryColor?: string | null;
  logoMediaId?: string | null;
}

/**
 * Reads the current tenant's branding (primary color, logo, custom name) and
 * injects it into the dashboard via CSS custom properties + a custom event
 * that Nav and other components can listen to. Lives inside the dashboard
 * layout so the public marketing site keeps the default Community branding.
 */
export function ThemeInjector() {
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    api<Tenant>('/tenants/current').then(setTenant).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (tenant?.primaryColor) {
      const rgb = hexToRgbTriplet(tenant.primaryColor);
      if (rgb) {
        root.style.setProperty('--brand-rgb', rgb.main);
        root.style.setProperty('--brand-dark-rgb', rgb.dark);
      }
    } else {
      root.style.removeProperty('--brand-rgb');
      root.style.removeProperty('--brand-dark-rgb');
    }
    if (typeof window !== 'undefined') {
      (window as any).__community_tenant = tenant;
      window.dispatchEvent(new CustomEvent('community:tenant-changed', { detail: tenant }));
    }
  }, [tenant]);

  return null;
}

function hexToRgbTriplet(hex: string): { main: string; dark: string } | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dark = (n: number) => Math.max(0, Math.round(n * 0.7));
  return {
    main: `${r} ${g} ${b}`,
    dark: `${dark(r)} ${dark(g)} ${dark(b)}`,
  };
}
