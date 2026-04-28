'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { api } from '@/lib/api';

interface Post {
  id: string;
  content: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  targets: { account: { provider: string } }[];
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));

  useEffect(() => {
    api<Post[]>('/posts').then(setPosts);
  }, []);

  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    // Monday-first index (0 = Mon, 6 = Sun)
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const date = p.scheduledAt || p.publishedAt;
      if (!date) continue;
      const key = ymd(new Date(date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [posts]);

  const today = ymd(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setCursor(addMonths(cursor, -1))}
            className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700"
          >‹</button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700 text-sm"
          >Aujourd'hui</button>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="px-3 py-1 rounded border border-slate-300 dark:border-slate-700"
          >›</button>
          <Link href="/posts/new" className="ml-2 px-3 py-1 rounded bg-brand text-white text-sm">Nouveau</Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {DAYS.map(d => (
          <div key={d} className="bg-slate-50 dark:bg-slate-900 px-2 py-1 text-xs font-medium text-slate-500">{d}</div>
        ))}
        {grid.map((day, i) => {
          const key = day ? ymd(day) : `e${i}`;
          const dayPosts = day ? byDay.get(ymd(day)) ?? [] : [];
          return (
            <div
              key={key}
              className={clsx(
                'bg-white dark:bg-slate-950 min-h-[110px] p-1.5 text-xs',
                day && ymd(day) === today && 'ring-2 ring-brand/40 ring-inset',
                !day && 'bg-slate-50 dark:bg-slate-900',
              )}
            >
              {day && (
                <>
                  <div className="text-slate-500 mb-1">{day.getDate()}</div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, 3).map(p => (
                      <Link
                        key={p.id}
                        href={`/posts`}
                        className={clsx(
                          'block px-1.5 py-0.5 rounded truncate text-[11px]',
                          p.status === 'PUBLISHED' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
                          p.status === 'SCHEDULED' && 'bg-brand/15 text-brand',
                          p.status === 'FAILED' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                          (p.status === 'DRAFT' || p.status === 'PUBLISHING') && 'bg-slate-100 dark:bg-slate-800',
                        )}
                        title={p.content}
                      >
                        {p.content.slice(0, 40)}
                      </Link>
                    ))}
                    {dayPosts.length > 3 && (
                      <p className="text-[11px] text-slate-500">+ {dayPosts.length - 3} autre(s)</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-slate-500 flex gap-4 flex-wrap">
        <Legend color="bg-brand/15 text-brand" label="Programmé" />
        <Legend color="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" label="Publié" />
        <Legend color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" label="Échec" />
        <Legend color="bg-slate-100 dark:bg-slate-800" label="Brouillon" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx('inline-block w-3 h-3 rounded', color)} />
      {label}
    </span>
  );
}
