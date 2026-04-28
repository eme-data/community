import clsx from 'clsx';

export interface Step {
  key: string;
  label: string;
}

export function Stepper({ steps, currentKey }: { steps: Step[]; currentKey: string }) {
  const idx = Math.max(0, steps.findIndex((s) => s.key === currentKey));
  return (
    <ol className="flex items-center justify-center gap-2 mb-10">
      {steps.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={s.key} className="flex items-center">
            <span
              className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition',
                done && 'bg-brand text-white',
                active && 'bg-brand text-white ring-4 ring-brand/20',
                !done && !active && 'bg-slate-200 dark:bg-slate-800 text-slate-500',
              )}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={clsx('ml-2 text-sm hidden sm:inline', active ? 'font-medium' : 'text-slate-500')}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className={clsx('w-8 sm:w-12 h-px mx-2', done ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
