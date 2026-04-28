'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

interface ListResponse {
  items: Notification[];
  unreadCount: number;
}

const POLL_MS = 30_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ListResponse>({ items: [], unreadCount: 0 });
  const ref = useRef<HTMLDivElement | null>(null);

  async function load() {
    try {
      const res = await api<ListResponse>('/notifications?limit=20');
      setData(res);
    } catch {
      // silently ignore — user is probably logged out
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: 'POST' });
    load();
  }
  async function markAllRead() {
    await api('/notifications/read-all', { method: 'POST' });
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1 text-slate-600 dark:text-slate-300 hover:text-brand"
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {data.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
            {data.unreadCount > 99 ? '99+' : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[60vh] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-lg z-20">
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
            <p className="font-semibold text-sm">Notifications</p>
            {data.unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand hover:underline">
                Tout marquer lu
              </button>
            )}
          </div>
          {data.items.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">Aucune notification.</p>
          ) : (
            <ul>
              {data.items.map((n) => (
                <li
                  key={n.id}
                  className={`p-3 border-b border-slate-200 dark:border-slate-800 last:border-b-0 ${!n.readAt ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => {
                            if (!n.readAt) markRead(n.id);
                            setOpen(false);
                          }}
                          className="block hover:text-brand"
                        >
                          <p className="text-sm font-medium">{n.title}</p>
                          {n.body && <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>}
                        </Link>
                      ) : (
                        <>
                          <p className="text-sm font-medium">{n.title}</p>
                          {n.body && <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>}
                        </>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!n.readAt && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs text-brand hover:underline"
                      >
                        Lu
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
