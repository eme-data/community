'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiUpload } from '@/lib/api';

interface ImportResult {
  total: number;
  success: number;
  failureCount: number;
  failures: { line: number; error: string }[];
}

const SAMPLE_CSV = `content,scheduled_at,account_ids,thread
"Hello world from Community 👋",,acc_id_1;acc_id_2,
"Big launch this Friday — stay tuned",2026-05-01T09:00:00Z,acc_id_1,
"X thread example",,acc_twitter_id,"Tweet 2 of the thread|Tweet 3 of the thread"
`;

export default function BulkImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiUpload<ImportResult>('/posts/bulk-import', file);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Échec de l\'import');
    } finally {
      setLoading(false);
    }
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'community-import-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Import CSV</h1>
        <p className="text-sm text-slate-500">
          Importez plusieurs publications en une seule fois depuis un fichier CSV.
          Colonnes obligatoires : <code>content</code> et <code>account_ids</code>.
          Optionnel : <code>scheduled_at</code> (ISO 8601), <code>thread</code> (séparé par <code>|</code>).
          Plusieurs comptes ciblés : séparez les IDs par <code>;</code>.
        </p>
      </div>

      <button onClick={downloadSample} className="text-sm underline">Télécharger un exemple CSV</button>

      <form onSubmit={onSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
        <input
          type="file"
          accept=".csv,text/csv"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading || !file} className="px-5 py-2 rounded bg-brand text-white disabled:opacity-50">
          {loading ? 'Import en cours...' : 'Importer'}
        </button>
      </form>

      {result && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
          <p className="font-semibold">Résultat</p>
          <p className="text-sm">
            <span className="text-emerald-700">{result.success} créés</span> ·{' '}
            {result.failureCount > 0 && <span className="text-red-600">{result.failureCount} échecs</span>}
            {result.failureCount === 0 && <span className="text-slate-500">aucun échec</span>}
            {' '}sur {result.total} lignes
          </p>
          {result.failures.length > 0 && (
            <ul className="text-sm space-y-1">
              {result.failures.slice(0, 20).map(f => (
                <li key={f.line} className="text-red-600">Ligne {f.line} : {f.error}</li>
              ))}
              {result.failures.length > 20 && <li className="text-slate-500">+ {result.failures.length - 20} autres erreurs</li>}
            </ul>
          )}
          <Link href="/posts" className="inline-block mt-2 text-sm underline">Voir les publications</Link>
        </div>
      )}
    </div>
  );
}
