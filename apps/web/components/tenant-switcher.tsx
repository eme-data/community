'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

interface Tenant {
  id: string;
  slug: string;
  name: string;
}

export function TenantSwitcher() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [current, setCurrent] = useState<Tenant | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    Promise.all([api<Tenant[]>('/tenants'), api<Tenant>('/tenants/current')])
      .then(([list, cur]) => {
        setTenants(list);
        setCurrent(cur);
      })
      .catch(() => {});
  }, []);

  async function switchTo(tenantId: string) {
    if (current?.id === tenantId) {
      setOpen(false);
      return;
    }
    const res = await api<{ accessToken: string }>('/auth/switch-tenant', {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    });
    setToken(res.accessToken);
    setOpen(false);
    router.refresh();
    // hard reload so all client components re-fetch with the new tenant scope
    if (typeof window !== 'undefined') window.location.href = '/dashboard';
  }

  if (!current || tenants.length <= 1) {
    return current ? (
      <span className="text-xs text-slate-500 px-2">{current.name}</span>
    ) : null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="font-medium truncate max-w-[10rem]">{current.name}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <ul className="absolute mt-1 w-56 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow z-20">
          {tenants.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => switchTo(t.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 flex justify-between"
              >
                <span>{t.name}</span>
                {t.id === current.id && <span className="text-brand">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
