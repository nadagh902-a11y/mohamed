import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DailyHistoryEntry, DhikrPreset, DhikrProgress } from '../types/tasbih';

interface HistoryPanelProps {
  presets: DhikrPreset[];
  progressById: Record<string, DhikrProgress>;
  dailyHistory: Record<string, number>;
  todayKey: string;
  dailyGoal: number;
  onUpdateDailyGoal: (goal: number) => void;
  onClearHistory: () => void;
}

function getLast7Days(todayKey: string, dailyHistory: Record<string, number>): (DailyHistoryEntry & { dayLabel: string; isToday: boolean })[] {
  const days: (DailyHistoryEntry & { dayLabel: string; isToday: boolean })[] = [];
  const [y, m, d] = todayKey.split('-').map(Number);
  const baseDate = new Date(y, (m || 1) - 1, d || 1);

  const formatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });

  for (let i = 6; i >= 0; i--) {
    const dt = new Date(baseDate);
    dt.setDate(baseDate.getDate() - i);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const rawLabel = formatter.format(dt).replace('.', '');
    const dayLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

    days.push({
      date: key,
      total: dailyHistory[key] ?? 0,
      dayLabel,
      isToday: key === todayKey,
    });
  }
  return days;
}

function computeStreak(todayKey: string, dailyHistory: Record<string, number>): number {
  const [y, m, d] = todayKey.split('-').map(Number);
  const baseDate = new Date(y, (m || 1) - 1, d || 1);

  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dt = new Date(baseDate);
    dt.setDate(baseDate.getDate() - i);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const count = dailyHistory[key] ?? 0;

    if (count > 0) {
      streak++;
    } else if (i === 0) {
      // Allow today to still be 0 if yesterday had activity
      continue;
    } else {
      break;
    }
  }
  return streak;
}

export function HistoryPanel({
  presets,
  progressById,
  dailyHistory,
  todayKey,
  dailyGoal,
  onUpdateDailyGoal,
  onClearHistory,
}: HistoryPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const todayCount = dailyHistory[todayKey] ?? 0;
  const goalPct = dailyGoal > 0 ? Math.min(100, Math.round((todayCount / dailyGoal) * 100)) : 0;
  const totalAllTime = Object.values(progressById).reduce(
    (sum, item) => sum + (item.totalAllTime || 0),
    0
  );
  const totalCycles = Object.values(progressById).reduce(
    (sum, item) => sum + (item.cycles || 0),
    0
  );
  const streak = computeStreak(todayKey, dailyHistory);

  const last7Days = getLast7Days(todayKey, dailyHistory);
  const maxDaily = Math.max(10, ...last7Days.map((d) => d.total));

  const rankedDhikrs = presets
    .map((p) => ({
      preset: p,
      total: progressById[p.id]?.totalAllTime ?? 0,
      cycles: progressById[p.id]?.cycles ?? 0,
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <section aria-labelledby="history-panel-heading" className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2
            id="history-panel-heading"
            className="font-display text-2xl font-semibold tracking-tight text-[#132A23] dark:text-[#EBF0ED]"
          >
            Progression
          </h2>
          <p className="mt-0.5 text-xs text-[#132A23]/60 dark:text-[#EBF0ED]/60">
            Suivi quotidien enregistré localement sur votre appareil
          </p>
        </div>
      </div>

      {/* Daily Goal Card */}
      <div className="rounded-2xl border border-[#132A23]/10 bg-white p-5 dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#132A23] dark:text-[#EBF0ED]">
              Objectif quotidien
            </h3>
            <p className="mt-0.5 font-mono text-xs text-[#132A23]/60 tabular-nums dark:text-[#EBF0ED]/60">
              {todayCount.toLocaleString('fr-FR')} sur {dailyGoal.toLocaleString('fr-FR')} grains
              {todayCount >= dailyGoal ? ' · Objectif atteint' : ` · ${goalPct} %`}
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-[#F7F8F6] p-1 dark:bg-[#0C1210]">
            {[100, 300, 500, 1000].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onUpdateDailyGoal(g)}
                className={`min-h-[34px] rounded-lg px-2.5 py-1 font-mono text-xs font-medium transition-colors tabular-nums ${
                  dailyGoal === g
                    ? 'bg-white text-[#1B5E48] shadow-xs dark:bg-[#1A2622] dark:text-[#34A87E]'
                    : 'text-[#132A23]/60 hover:text-[#132A23] dark:text-[#EBF0ED]/60 dark:hover:text-[#EBF0ED]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#132A23]/8 dark:bg-[#EBF0ED]/10">
          <div
            style={{ width: `${Math.max(todayCount > 0 ? 3 : 0, goalPct)}%` }}
            className={`h-full rounded-full transition-all duration-200 ${
              todayCount >= dailyGoal
                ? 'bg-[#B5893A] dark:bg-[#D4AF6A]'
                : 'bg-[#1B5E48] dark:bg-[#34A87E]'
            }`}
          />
        </div>
      </div>

      {/* Summary Grid (2x2 on mobile, 4 columns on desktop) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#132A23]/10 bg-white p-4 dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
          <div className="text-xs font-medium text-[#132A23]/60 dark:text-[#EBF0ED]/60">
            Aujourd’hui
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#132A23] tabular-nums dark:text-[#EBF0ED]">
            {todayCount.toLocaleString('fr-FR')}
          </div>
        </div>

        <div className="rounded-2xl border border-[#132A23]/10 bg-white p-4 dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
          <div className="text-xs font-medium text-[#132A23]/60 dark:text-[#EBF0ED]/60">
            Total cumulé
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#132A23] tabular-nums dark:text-[#EBF0ED]">
            {totalAllTime.toLocaleString('fr-FR')}
          </div>
        </div>

        <div className="rounded-2xl border border-[#132A23]/10 bg-white p-4 dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
          <div className="text-xs font-medium text-[#132A23]/60 dark:text-[#EBF0ED]/60">
            Cycles complets
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#132A23] tabular-nums dark:text-[#EBF0ED]">
            {totalCycles.toLocaleString('fr-FR')}
          </div>
        </div>

        <div className="rounded-2xl border border-[#132A23]/10 bg-white p-4 dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
          <div className="text-xs font-medium text-[#132A23]/60 dark:text-[#EBF0ED]/60">
            Série active
          </div>
          <div className="mt-1.5 font-mono text-2xl font-semibold text-[#1B5E48] tabular-nums dark:text-[#34A87E]">
            {streak} {streak > 1 ? 'jours' : 'jour'}
          </div>
        </div>
      </div>

      {/* 7-day Activity Bar Chart */}
      <div className="rounded-2xl border border-[#132A23]/10 bg-white p-5 dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#132A23] dark:text-[#EBF0ED]">
            7 derniers jours
          </h3>
          <span className="font-mono text-xs text-[#132A23]/55 tabular-nums dark:text-[#EBF0ED]/55">
            {last7Days.reduce((s, d) => s + d.total, 0).toLocaleString('fr-FR')} grains cette semaine
          </span>
        </div>

        <div className="mt-5 grid h-36 grid-cols-7 items-end gap-2.5 sm:gap-4">
          {last7Days.map((day) => {
            const heightPct = day.total > 0 ? Math.max(8, Math.round((day.total / maxDaily) * 100)) : 4;
            return (
              <div
                key={day.date}
                className="flex h-full flex-col items-center justify-end gap-2"
              >
                <span className="font-mono text-[11px] text-[#132A23]/60 tabular-nums dark:text-[#EBF0ED]/60">
                  {day.total > 0 ? day.total : '0'}
                </span>
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[34px] rounded-t-lg transition-all duration-200 ${
                      day.total === 0
                        ? 'bg-[#132A23]/8 dark:bg-[#EBF0ED]/8'
                        : day.isToday
                          ? 'bg-[#1B5E48] dark:bg-[#34A87E]'
                          : 'bg-[#1B5E48]/45 dark:bg-[#34A87E]/45'
                    }`}
                    title={`${day.dayLabel} (${day.date}) : ${day.total}`}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    day.isToday
                      ? 'text-[#1B5E48] dark:text-[#34A87E]'
                      : 'text-[#132A23]/55 dark:text-[#EBF0ED]/55'
                  }`}
                >
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-Dhikr Breakdown */}
      <div className="rounded-2xl border border-[#132A23]/10 bg-white p-5 dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
        <h3 className="text-sm font-semibold text-[#132A23] dark:text-[#EBF0ED]">
          Répartition par invocation
        </h3>

        {rankedDhikrs.length === 0 ? (
          <p className="mt-4 text-sm text-[#132A23]/55 dark:text-[#EBF0ED]/55">
            Aucun tasbih compté pour le moment. Touchez le compteur pour commencer votre suivi.
          </p>
        ) : (
          <ul className="mt-4 space-y-3.5">
            {rankedDhikrs.map(({ preset, total, cycles }) => {
              const sharePct = totalAllTime > 0 ? Math.round((total / totalAllTime) * 100) : 0;
              return (
                <li key={preset.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-[#132A23] dark:text-[#EBF0ED]">
                      {preset.title}
                    </span>
                    <div className="shrink-0 font-mono text-xs text-[#132A23]/70 tabular-nums dark:text-[#EBF0ED]/70">
                      {total.toLocaleString('fr-FR')}
                      {cycles > 0 && ` · ${cycles} ${cycles > 1 ? 'cycles' : 'cycle'}`}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#132A23]/8 dark:bg-[#EBF0ED]/10">
                    <div
                      style={{ width: `${Math.max(3, sharePct)}%` }}
                      className="h-full rounded-full bg-[#1B5E48] dark:bg-[#34A87E]"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Safe History Reset */}
      {totalAllTime > 0 && (
        <div className="flex items-center justify-end">
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium text-[#132A23]/60 transition-colors hover:bg-red-500/10 hover:text-red-700 dark:text-[#EBF0ED]/60 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Effacer tout l’historique</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/5 px-4 py-2.5">
              <span className="text-xs font-medium text-red-800 dark:text-red-300">
                Confirmer la remise à zéro complète ?
              </span>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="min-h-[36px] rounded-lg px-3 py-1 text-xs font-medium text-[#132A23]/75 hover:bg-[#132A23]/5 dark:text-[#EBF0ED]/75 dark:hover:bg-[#EBF0ED]/10"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setConfirmClear(false);
                }}
                className="min-h-[36px] rounded-lg bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Effacer
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
