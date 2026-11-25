import {
  BookOpen,
  BarChart3,
  CircleDot,
  Moon,
  PenLine,
  RotateCcw,
  Sun,
  Undo2,
  Volume2,
  VolumeX,
  Smartphone,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BeadRing } from './components/BeadRing';
import { DhikrPanel } from './components/DhikrPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { TopBar } from './components/TopBar';
import { BEAD_MATERIALS, DEFAULT_DHIKR_PRESETS, TARGET_OPTIONS } from './data/presets';
import {
  AppView,
  BeadMaterialId,
  DhikrPreset,
  DhikrProgress,
  TasbihPreferences,
} from './types/tasbih';
import {
  playBeadClick,
  playCycleChime,
  playUndoTick,
  triggerHaptic,
} from './utils/sound';

const STORAGE_KEY = 'tesbih_app_state_v1';

interface PersistedState {
  activeDhikrId: string;
  customPresets: DhikrPreset[];
  customTargets: Record<string, number>;
  progressById: Record<string, DhikrProgress>;
  dailyHistory: Record<string, number>;
  preferences: TasbihPreferences;
}

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DEFAULT_PREFERENCES: TasbihPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  darkMode: false,
  beadMaterial: 'jade',
  autoAdvanceCycle: true,
  dailyGoal: 300,
};

function loadInitialState(): PersistedState {
  if (typeof window === 'undefined') {
    return {
      activeDhikrId: DEFAULT_DHIKR_PRESETS[0].id,
      customPresets: [],
      customTargets: {},
      progressById: {},
      dailyHistory: {},
      preferences: DEFAULT_PREFERENCES,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        activeDhikrId: parsed.activeDhikrId || DEFAULT_DHIKR_PRESETS[0].id,
        customPresets: Array.isArray(parsed.customPresets) ? parsed.customPresets : [],
        customTargets: parsed.customTargets || {},
        progressById: parsed.progressById || {},
        dailyHistory: parsed.dailyHistory || {},
        preferences: { ...DEFAULT_PREFERENCES, ...(parsed.preferences || {}) },
      };
    }
  } catch {
    // Fallback to clean defaults on corrupt storage
  }

  return {
    activeDhikrId: DEFAULT_DHIKR_PRESETS[0].id,
    customPresets: [],
    customTargets: {},
    progressById: {},
    dailyHistory: {},
    preferences: DEFAULT_PREFERENCES,
  };
}

export default function App() {
  const [state, setState] = useState<PersistedState>(loadInitialState);
  const [activeView, setActiveView] = useState<AppView>('compteur');
  const [zenMode, setZenMode] = useState(false);
  const [totalTapIndex, setTotalTapIndex] = useState(0);
  const [justCompletedCycle, setJustCompletedCycle] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [customTargetOpen, setCustomTargetOpen] = useState(false);
  const [customTargetValue, setCustomTargetValue] = useState('33');
  const [quickWriteOpen, setQuickWriteOpen] = useState(false);
  const [quickWriteText, setQuickWriteText] = useState('');
  const [quickWriteTarget, setQuickWriteTarget] = useState<number>(33);

  const cycleTimerRef = useRef<number | null>(null);
  const todayKey = getTodayKey();

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (state.preferences.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state.preferences.darkMode]);

  // Persist state to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

  const allPresets = useMemo(
    () => [...DEFAULT_DHIKR_PRESETS, ...state.customPresets],
    [state.customPresets]
  );

  const activePreset = useMemo(
    () => allPresets.find((p) => p.id === state.activeDhikrId) || allPresets[0],
    [allPresets, state.activeDhikrId]
  );

  const activeProgress: DhikrProgress = useMemo(
    () =>
      state.progressById[activePreset.id] || {
        count: 0,
        cycles: 0,
        totalAllTime: 0,
        sequenceStepIndex: 0,
      },
    [state.progressById, activePreset.id]
  );

  const sequenceStepIndex = activePreset.sequence
    ? Math.min(activeProgress.sequenceStepIndex ?? 0, activePreset.sequence.length - 1)
    : 0;
  const activeSequenceStep = activePreset.sequence
    ? activePreset.sequence[sequenceStepIndex]
    : null;

  const activeTarget = activeSequenceStep
    ? activeSequenceStep.target
    : state.customTargets[activePreset.id] !== undefined
      ? state.customTargets[activePreset.id]
      : activePreset.defaultTarget;

  const activeMaterial = useMemo(
    () =>
      BEAD_MATERIALS.find((m) => m.id === state.preferences.beadMaterial) ||
      BEAD_MATERIALS[0],
    [state.preferences.beadMaterial]
  );

  const triggerCycleFeedback = useCallback(() => {
    setJustCompletedCycle(true);
    if (cycleTimerRef.current) {
      window.clearTimeout(cycleTimerRef.current);
    }
    cycleTimerRef.current = window.setTimeout(() => {
      setJustCompletedCycle(false);
    }, 900);
  }, []);

  const handleIncrement = useCallback(() => {
    setConfirmReset(false);
    setTotalTapIndex((prev) => prev + 1);

    const willRollOver = activeTarget > 0 && activeProgress.count >= activeTarget;
    const predictedNextStepIdx =
      willRollOver && activePreset.sequence
        ? (sequenceStepIndex + 1) % activePreset.sequence.length
        : sequenceStepIndex;
    const predictedNextTarget = activePreset.sequence
      ? activePreset.sequence[predictedNextStepIdx].target
      : activeTarget;
    const predictedNextCount = willRollOver ? 1 : activeProgress.count + 1;
    const completedCycleNow =
      predictedNextTarget > 0 && predictedNextCount === predictedNextTarget;
    const isEvery11 =
      predictedNextCount > 0 && predictedNextCount % 11 === 0 && !completedCycleNow;

    if (completedCycleNow) {
      triggerCycleFeedback();
      if (state.preferences.soundEnabled) playCycleChime();
      if (state.preferences.vibrationEnabled) triggerHaptic([24, 45, 24]);
    } else {
      if (state.preferences.soundEnabled) playBeadClick(isEvery11);
      if (state.preferences.vibrationEnabled) triggerHaptic(isEvery11 ? 22 : 12);
    }

    setState((prev) => {
      const presets = [...DEFAULT_DHIKR_PRESETS, ...prev.customPresets];
      const preset = presets.find((p) => p.id === prev.activeDhikrId) || presets[0];
      const currentProg: DhikrProgress = prev.progressById[preset.id] || {
        count: 0,
        cycles: 0,
        totalAllTime: 0,
        sequenceStepIndex: 0,
      };

      const stepIdx = preset.sequence
        ? Math.min(currentProg.sequenceStepIndex ?? 0, preset.sequence.length - 1)
        : 0;
      const step = preset.sequence ? preset.sequence[stepIdx] : null;
      const target = step
        ? step.target
        : prev.customTargets[preset.id] !== undefined
          ? prev.customTargets[preset.id]
          : preset.defaultTarget;

      let nextCount = currentProg.count + 1;
      let nextCycles = currentProg.cycles;
      let nextStepIdx = stepIdx;

      if (target > 0) {
        if (currentProg.count >= target) {
          nextCount = 1;
          if (preset.sequence) {
            nextStepIdx = (stepIdx + 1) % preset.sequence.length;
          }
          const nextTarget = preset.sequence
            ? preset.sequence[nextStepIdx].target
            : target;
          if (nextCount === nextTarget) {
            if (!preset.sequence || nextStepIdx === preset.sequence.length - 1) {
              nextCycles += 1;
            }
          }
        } else if (nextCount === target) {
          if (!preset.sequence || stepIdx === preset.sequence.length - 1) {
            nextCycles += 1;
          }
        }
      }

      const today = getTodayKey();
      const updatedToday = (prev.dailyHistory[today] || 0) + 1;

      return {
        ...prev,
        progressById: {
          ...prev.progressById,
          [preset.id]: {
            count: nextCount,
            cycles: nextCycles,
            totalAllTime: currentProg.totalAllTime + 1,
            sequenceStepIndex: preset.sequence ? nextStepIdx : undefined,
          },
        },
        dailyHistory: {
          ...prev.dailyHistory,
          [today]: updatedToday,
        },
      };
    });
  }, [
    activeTarget,
    activeProgress.count,
    activePreset.sequence,
    sequenceStepIndex,
    state.preferences.soundEnabled,
    state.preferences.vibrationEnabled,
    triggerCycleFeedback,
  ]);

  const handleUndo = useCallback(() => {
    setConfirmReset(false);
    if (activeProgress.count <= 0) return;

    setState((prev) => {
      const preset = allPresets.find((p) => p.id === prev.activeDhikrId) || allPresets[0];
      const currentProg = prev.progressById[preset.id];
      if (!currentProg || currentProg.count <= 0) return prev;

      const stepIdx = preset.sequence
        ? Math.min(currentProg.sequenceStepIndex ?? 0, preset.sequence.length - 1)
        : 0;
      const step = preset.sequence ? preset.sequence[stepIdx] : null;
      const target = step
        ? step.target
        : prev.customTargets[preset.id] !== undefined
          ? prev.customTargets[preset.id]
          : preset.defaultTarget;

      const wasAtTarget = target > 0 && currentProg.count === target;
      const shouldDecrementCycle =
        wasAtTarget &&
        currentProg.cycles > 0 &&
        (!preset.sequence || stepIdx === preset.sequence.length - 1);

      const today = getTodayKey();
      const currentDaily = prev.dailyHistory[today] || 0;

      return {
        ...prev,
        progressById: {
          ...prev.progressById,
          [preset.id]: {
            ...currentProg,
            count: currentProg.count - 1,
            cycles: shouldDecrementCycle ? currentProg.cycles - 1 : currentProg.cycles,
            totalAllTime: Math.max(0, currentProg.totalAllTime - 1),
          },
        },
        dailyHistory: {
          ...prev.dailyHistory,
          [today]: Math.max(0, currentDaily - 1),
        },
      };
    });

    if (state.preferences.soundEnabled) playUndoTick();
    if (state.preferences.vibrationEnabled) triggerHaptic(8);
  }, [activeProgress.count, allPresets, state.preferences.soundEnabled, state.preferences.vibrationEnabled]);

  const handleResetCurrent = useCallback(() => {
    setState((prev) => {
      const currentProg = prev.progressById[activePreset.id];
      if (!currentProg) return prev;
      return {
        ...prev,
        progressById: {
          ...prev.progressById,
          [activePreset.id]: {
            ...currentProg,
            count: 0,
            sequenceStepIndex: activePreset.sequence ? 0 : undefined,
          },
        },
      };
    });
    setConfirmReset(false);
    setJustCompletedCycle(false);
    if (state.preferences.vibrationEnabled) triggerHaptic(15);
  }, [activePreset.id, activePreset.sequence, state.preferences.vibrationEnabled]);

  const handleSelectTarget = (targetVal: number) => {
    if (activePreset.sequence) return;
    setCustomTargetOpen(false);
    setState((prev) => ({
      ...prev,
      customTargets: {
        ...prev.customTargets,
        [activePreset.id]: targetVal,
      },
    }));
  };

  const handleApplyCustomTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Math.max(1, Math.min(99999, parseInt(customTargetValue, 10) || 33));
    handleSelectTarget(parsed);
  };

  const handleSelectSequenceStep = (idx: number) => {
    if (!activePreset.sequence) return;
    setConfirmReset(false);
    setState((prev) => {
      const currentProg = prev.progressById[activePreset.id] || {
        count: 0,
        cycles: 0,
        totalAllTime: 0,
        sequenceStepIndex: 0,
      };
      return {
        ...prev,
        progressById: {
          ...prev.progressById,
          [activePreset.id]: {
            ...currentProg,
            count: 0,
            sequenceStepIndex: idx,
          },
        },
      };
    });
  };

  const handleSelectDhikr = (id: string) => {
    setConfirmReset(false);
    setCustomTargetOpen(false);
    setState((prev) => ({ ...prev, activeDhikrId: id }));
    if (activeView === 'invocations') {
      setActiveView('compteur');
    }
  };

  const handleAddCustomDhikr = (item: Omit<DhikrPreset, 'id' | 'isCustom'>) => {
    const newId = `custom-${Date.now()}`;
    const newPreset: DhikrPreset = {
      ...item,
      id: newId,
      isCustom: true,
    };
    setState((prev) => ({
      ...prev,
      customPresets: [...prev.customPresets, newPreset],
      activeDhikrId: newId,
    }));
    setActiveView('compteur');
  };

  const handleQuickWriteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = quickWriteText.trim();
    if (!trimmed) return;
    const hasArabic = /[\u0600-\u06FF]/.test(trimmed);
    handleAddCustomDhikr({
      title: trimmed,
      arabic: hasArabic ? trimmed : '',
      transliteration: '',
      meaning: 'Tasbih personnalisé',
      defaultTarget: quickWriteTarget,
    });
    setQuickWriteText('');
    setQuickWriteTarget(33);
    setQuickWriteOpen(false);
  };

  const handleDeleteCustomDhikr = (id: string) => {
    setState((prev) => {
      const nextCustom = prev.customPresets.filter((p) => p.id !== id);
      const nextActive =
        prev.activeDhikrId === id ? DEFAULT_DHIKR_PRESETS[0].id : prev.activeDhikrId;
      return {
        ...prev,
        customPresets: nextCustom,
        activeDhikrId: nextActive,
      };
    });
  };

  const handleClearHistory = () => {
    setState((prev) => ({
      ...prev,
      progressById: {},
      dailyHistory: {},
    }));
  };

  const togglePreference = (key: 'soundEnabled' | 'vibrationEnabled' | 'darkMode') => {
    setState((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: !prev.preferences[key],
      },
    }));
  };

  const setBeadMaterial = (materialId: BeadMaterialId) => {
    setState((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        beadMaterial: materialId,
      },
    }));
  };

  const setDailyGoal = (goal: number) => {
    setState((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        dailyGoal: goal,
      },
    }));
  };

  // Keyboard shortcuts on desktop
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape' && zenMode) {
        setZenMode(false);
        return;
      }

      if (activeView === 'compteur' || zenMode) {
        if (e.code === 'Space' && tag !== 'BUTTON') {
          e.preventDefault();
          handleIncrement();
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeView, zenMode, handleIncrement, handleUndo]);

  const todayCount = state.dailyHistory[todayKey] ?? 0;
  const totalAllTime = Object.values(state.progressById).reduce(
    (sum, p) => sum + (p.totalAllTime || 0),
    0
  );

  const displayedArabic = activeSequenceStep ? activeSequenceStep.arabic : activePreset.arabic;
  const displayedTitle = activeSequenceStep ? activeSequenceStep.label : activePreset.title;
  const displayedSub = activeSequenceStep
    ? `${activeSequenceStep.transliteration} · ${activeSequenceStep.meaning}`
    : [activePreset.transliteration, activePreset.meaning].filter(Boolean).join(' · ');

  const isTargetReached = activeTarget > 0 && activeProgress.count >= activeTarget;
  const nextStepPreview =
    isTargetReached && activePreset.sequence
      ? activePreset.sequence[(sequenceStepIndex + 1) % activePreset.sequence.length].label
      : null;

  return (
    <div className="min-h-screen bg-[#F7F8F6] text-[#132A23] transition-colors duration-200 dark:bg-[#0C1210] dark:text-[#EBF0ED]">
      <TopBar
        activeView={activeView}
        onSelectView={setActiveView}
        zenMode={zenMode}
        onToggleZenMode={() => setZenMode((prev) => !prev)}
      />

      {/* Zen / Distraction-free Tap Surface */}
      {zenMode ? (
        <main
          onClick={handleIncrement}
          className="flex min-h-[calc(100vh-56px)] touch-manipulation cursor-pointer flex-col items-center justify-between px-4 py-8 select-none"
        >
          <div className="max-w-xl text-center">
            {displayedArabic && (
              <p
                dir="rtl"
                className="font-arabic text-3xl leading-relaxed text-[#132A23] dark:text-[#EBF0ED] sm:text-4xl"
              >
                {displayedArabic}
              </p>
            )}
            {displayedTitle !== displayedArabic ? (
              <h1 className="mt-2 font-display text-2xl font-semibold text-[#132A23] dark:text-[#EBF0ED] sm:text-3xl">
                {displayedTitle}
              </h1>
            ) : (
              <h1 className="sr-only">{displayedTitle}</h1>
            )}
            <p className="mt-1 text-xs text-[#132A23]/60 dark:text-[#EBF0ED]/60">
              Touchez n’importe où sur l’écran ou appuyez sur Espace
            </p>
          </div>

          <div onClick={(e) => e.stopPropagation()} className="my-6">
            <BeadRing
              count={activeProgress.count}
              target={activeTarget}
              totalTapIndex={totalTapIndex}
              material={activeMaterial}
              darkMode={state.preferences.darkMode}
              justCompletedCycle={justCompletedCycle}
              onIncrement={handleIncrement}
            />
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-3"
          >
            <button
              type="button"
              onClick={handleUndo}
              disabled={activeProgress.count <= 0}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#132A23]/12 bg-white px-4 py-2 text-xs font-medium text-[#132A23] disabled:opacity-40 dark:border-[#EBF0ED]/12 dark:bg-[#131C19] dark:text-[#EBF0ED]"
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              <span>-1</span>
            </button>

            <button
              type="button"
              onClick={handleResetCurrent}
              disabled={activeProgress.count <= 0}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#132A23]/12 bg-white px-4 py-2 text-xs font-medium text-[#132A23] disabled:opacity-40 dark:border-[#EBF0ED]/12 dark:bg-[#131C19] dark:text-[#EBF0ED]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Remettre à zéro</span>
            </button>
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-6xl px-3 pt-3 pb-20 sm:px-6 lg:py-8 lg:pb-12">
          {activeView === 'compteur' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
              {/* Left / Center Tactile Counter Studio */}
              <section
                aria-label="Compteur de tesbih"
                className="flex flex-col items-center rounded-3xl border border-[#132A23]/10 bg-white px-3.5 py-4 sm:px-8 sm:py-8 dark:border-[#EBF0ED]/10 dark:bg-[#131C19] lg:col-span-7"
              >
                {/* Invocation Header */}
                <div className="w-full max-w-lg text-center">
                  <div className="mb-2 flex items-center justify-center sm:mb-3">
                    <button
                      type="button"
                      onClick={() => setQuickWriteOpen((prev) => !prev)}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#132A23]/12 bg-[#F7F8F6] px-3 py-1.5 text-xs font-medium text-[#132A23]/80 transition-colors hover:bg-[#132A23]/6 hover:text-[#132A23] focus-visible:outline-2 focus-visible:outline-[#1B5E48] dark:border-[#EBF0ED]/12 dark:bg-[#0C1210] dark:text-[#EBF0ED]/80 dark:hover:bg-[#EBF0ED]/10"
                    >
                      <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{quickWriteOpen ? 'Fermer la saisie' : 'Écrire un tasbih'}</span>
                    </button>
                  </div>

                  {quickWriteOpen && (
                    <form
                      onSubmit={handleQuickWriteSubmit}
                      className="mb-4 rounded-2xl border border-[#132A23]/12 bg-[#F7F8F6] p-3.5 text-left dark:border-[#EBF0ED]/12 dark:bg-[#0C1210]"
                    >
                      <label
                        htmlFor="quick-write-tasbih"
                        className="block text-xs font-medium text-[#132A23]/75 dark:text-[#EBF0ED]/75"
                      >
                        Écrivez votre tasbih (arabe ou français)
                      </label>
                      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                        <input
                          id="quick-write-tasbih"
                          type="text"
                          dir="auto"
                          autoFocus
                          value={quickWriteText}
                          onChange={(e) => setQuickWriteText(e.target.value)}
                          placeholder="Ex. : سبحان الله وبحمده"
                          className="min-h-[42px] flex-1 rounded-xl border border-[#132A23]/15 bg-white px-3 py-2 text-base text-[#132A23] placeholder:text-[#132A23]/40 focus:border-[#1B5E48] focus:outline-none dark:border-[#EBF0ED]/15 dark:bg-[#131C19] dark:text-[#EBF0ED] dark:placeholder:text-[#EBF0ED]/35 dark:focus:border-[#34A87E]"
                        />
                        <button
                          type="submit"
                          disabled={!quickWriteText.trim()}
                          className="min-h-[42px] rounded-xl bg-[#1B5E48] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#154A39] disabled:opacity-45 dark:bg-[#34A87E] dark:text-[#0C1210] dark:hover:bg-[#2C936E] whitespace-nowrap shrink-0"
                        >
                          Ajouter
                        </button>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-medium text-[#132A23]/60 dark:text-[#EBF0ED]/60">
                          Objectif :
                        </span>
                        {[
                          { val: 33, label: '33' },
                          { val: 99, label: '99' },
                          { val: 100, label: '100' },
                          { val: 0, label: 'Libre' },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setQuickWriteTarget(opt.val)}
                            className={`min-h-[32px] rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                              quickWriteTarget === opt.val
                                ? 'bg-[#1B5E48] text-white dark:bg-[#34A87E] dark:text-[#0C1210]'
                                : 'bg-white text-[#132A23]/70 hover:text-[#132A23] dark:bg-[#131C19] dark:text-[#EBF0ED]/70'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </form>
                  )}

                  {displayedArabic && (
                    <p
                      dir="rtl"
                      className="font-arabic text-2xl leading-snug text-[#132A23] dark:text-[#EBF0ED] sm:text-4xl sm:leading-relaxed"
                    >
                      {displayedArabic}
                    </p>
                  )}
                  {displayedTitle !== displayedArabic ? (
                    <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-balance text-[#132A23] dark:text-[#EBF0ED] sm:mt-2 sm:text-4xl">
                      {displayedTitle}
                    </h1>
                  ) : (
                    <h1 className="sr-only">{displayedTitle}</h1>
                  )}
                  {displayedSub && (
                    <p className="mt-1 text-xs leading-relaxed text-[#132A23]/65 dark:text-[#EBF0ED]/65 sm:mt-1.5 sm:text-sm">
                      {displayedSub}
                    </p>
                  )}

                  {/* Sequence Stepper for Tesbih après la prière */}
                  {activePreset.sequence && (
                    <div
                      role="tablist"
                      aria-label="Étapes du tesbih après la prière"
                      className="mt-2.5 inline-flex flex-wrap items-center justify-center gap-1 rounded-xl bg-[#F7F8F6] p-1 dark:bg-[#0C1210] sm:mt-4"
                    >
                      {activePreset.sequence.map((step, idx) => {
                        const active = idx === sequenceStepIndex;
                        const shortLabel =
                          idx < 3 ? step.arabic : 'التهليل';
                        return (
                          <button
                            key={step.label}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => handleSelectSequenceStep(idx)}
                            className={`min-h-[32px] rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 sm:min-h-[36px] sm:px-3 sm:py-1.5 sm:text-xs ${
                              active
                                ? 'bg-white text-[#1B5E48] shadow-xs dark:bg-[#1A2622] dark:text-[#34A87E]'
                                : 'text-[#132A23]/60 hover:text-[#132A23] dark:text-[#EBF0ED]/60 dark:hover:text-[#EBF0ED]'
                            }`}
                          >
                            <span className="font-mono">{idx + 1}.</span>{' '}
                            <span className="font-arabic text-xs sm:text-sm">{shortLabel}</span>{' '}
                            <span className="font-mono">({step.target})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cycle Completion Quiet Notice (Fixed min-height prevents layout jump) */}
                <div className="mt-2 flex min-h-[20px] items-center justify-center text-center sm:mt-3 sm:min-h-[24px]">
                  {isTargetReached ? (
                    <p className="text-xs font-medium text-[#B5893A] dark:text-[#D4AF6A]">
                      {nextStepPreview
                        ? `Cycle terminé · Touchez pour passer à ${nextStepPreview}`
                        : 'Cycle terminé · Touchez pour entamer un nouveau tour'}
                    </p>
                  ) : (
                    <p className="text-[11px] text-[#132A23]/50 tabular-nums dark:text-[#EBF0ED]/50 sm:text-xs">
                      {activeProgress.cycles > 0
                        ? `${activeProgress.cycles} ${activeProgress.cycles > 1 ? 'cycles complétés' : 'cycle complété'}`
                        : 'Touchez le cercle pour compter'}
                    </p>
                  )}
                </div>

                {/* Main Tactile Bead Ring */}
                <div className="my-1 sm:my-2">
                  <BeadRing
                    count={activeProgress.count}
                    target={activeTarget}
                    totalTapIndex={totalTapIndex}
                    material={activeMaterial}
                    darkMode={state.preferences.darkMode}
                    justCompletedCycle={justCompletedCycle}
                    onIncrement={handleIncrement}
                  />
                </div>

                {/* Primary Tactile Actions: Undo & Reset */}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={activeProgress.count <= 0}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#132A23]/12 bg-[#F7F8F6] px-4 py-2 text-xs font-medium text-[#132A23] transition-colors hover:bg-[#132A23]/8 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#1B5E48] dark:border-[#EBF0ED]/12 dark:bg-[#0C1210] dark:text-[#EBF0ED] dark:hover:bg-[#EBF0ED]/10"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                    <span>Annuler (-1)</span>
                  </button>

                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (activeProgress.count > 0) {
                          setConfirmReset(true);
                        }
                      }}
                      disabled={activeProgress.count <= 0}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#132A23]/12 bg-[#F7F8F6] px-4 py-2 text-xs font-medium text-[#132A23] transition-colors hover:bg-[#132A23]/8 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-[#1B5E48] dark:border-[#EBF0ED]/12 dark:bg-[#0C1210] dark:text-[#EBF0ED] dark:hover:bg-[#EBF0ED]/10"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      <span>Réinitialiser</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-xl border border-[#B5893A]/40 bg-[#B5893A]/10 px-2.5 py-1 dark:border-[#D4AF6A]/40 dark:bg-[#D4AF6A]/10">
                      <button
                        type="button"
                        onClick={handleResetCurrent}
                        className="min-h-[36px] rounded-lg bg-[#132A23] px-3 py-1 text-xs font-medium text-white dark:bg-[#EBF0ED] dark:text-[#0C1210]"
                      >
                        Confirmer zéro
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-medium text-[#132A23]/70 dark:text-[#EBF0ED]/70"
                      >
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                {/* Hairline Separator */}
                <div className="my-6 h-px w-full bg-[#132A23]/8 dark:bg-[#EBF0ED]/8" />

                {/* Workspace Preferences & Target Selector */}
                <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Target Selector (for non-sequence dhikrs) */}
                  {!activePreset.sequence ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-[#132A23]/60 dark:text-[#EBF0ED]/60">
                        Objectif
                      </span>
                      <div className="flex items-center gap-1 rounded-xl bg-[#F7F8F6] p-1 dark:bg-[#0C1210]">
                        {TARGET_OPTIONS.map((opt) => {
                          const isSelected = activeTarget === opt.value && !customTargetOpen;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectTarget(opt.value)}
                              className={`min-h-[36px] min-w-[38px] rounded-lg px-2.5 py-1 font-mono text-xs font-medium transition-colors tabular-nums ${
                                isSelected
                                  ? 'bg-white text-[#1B5E48] shadow-xs dark:bg-[#1A2622] dark:text-[#34A87E]'
                                  : 'text-[#132A23]/65 hover:text-[#132A23] dark:text-[#EBF0ED]/65 dark:hover:text-[#EBF0ED]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTargetValue(String(activeTarget || 33));
                            setCustomTargetOpen((prev) => !prev);
                          }}
                          className={`min-h-[36px] rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                            customTargetOpen ||
                            ![33, 99, 100, 0].includes(activeTarget)
                              ? 'bg-white text-[#1B5E48] shadow-xs dark:bg-[#1A2622] dark:text-[#34A87E]'
                              : 'text-[#132A23]/65 hover:text-[#132A23] dark:text-[#EBF0ED]/65 dark:hover:text-[#EBF0ED]'
                          }`}
                        >
                          {![33, 99, 100, 0].includes(activeTarget)
                            ? activeTarget
                            : 'Autre'}
                        </button>
                      </div>

                      {customTargetOpen && (
                        <form onSubmit={handleApplyCustomTarget} className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            max={99999}
                            value={customTargetValue}
                            onChange={(e) => setCustomTargetValue(e.target.value)}
                            aria-label="Objectif personnalisé"
                            className="w-20 rounded-lg border border-[#132A23]/15 bg-[#F7F8F6] px-2.5 py-1.5 font-mono text-xs tabular-nums focus:border-[#1B5E48] focus:outline-none dark:border-[#EBF0ED]/15 dark:bg-[#0C1210]"
                          />
                          <button
                            type="submit"
                            className="min-h-[36px] rounded-lg bg-[#1B5E48] px-3 py-1 text-xs font-medium text-white dark:bg-[#34A87E] dark:text-[#0C1210]"
                          >
                            OK
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-[#132A23]/60 dark:text-[#EBF0ED]/60">
                      Étape {sequenceStepIndex + 1} sur {activePreset.sequence.length}
                    </div>
                  )}

                  {/* Sensory & Material Controls */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Bead Material Swatches */}
                    <div
                      role="group"
                      aria-label="Matière des perles"
                      className="mr-1 flex items-center gap-1.5 rounded-xl bg-[#F7F8F6] px-2 py-1.5 dark:bg-[#0C1210]"
                    >
                      {BEAD_MATERIALS.map((mat) => {
                        const selected = state.preferences.beadMaterial === mat.id;
                        return (
                          <button
                            key={mat.id}
                            type="button"
                            onClick={() => setBeadMaterial(mat.id)}
                            title={`Perles en ${mat.label}`}
                            aria-label={`Perles en ${mat.label}`}
                            aria-pressed={selected}
                            className={`flex h-7 w-7 items-center justify-center rounded-full transition-transform ${
                              selected
                                ? 'scale-110 ring-2 ring-[#132A23] ring-offset-2 ring-offset-[#F7F8F6] dark:ring-[#EBF0ED] dark:ring-offset-[#0C1210]'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                          >
                            <span
                              className="h-4 w-4 rounded-full"
                              style={{
                                backgroundColor: state.preferences.darkMode
                                  ? mat.darkBeadFill
                                  : mat.beadFill,
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => togglePreference('soundEnabled')}
                      aria-pressed={state.preferences.soundEnabled}
                      title={state.preferences.soundEnabled ? 'Désactiver le son' : 'Activer le son'}
                      aria-label={state.preferences.soundEnabled ? 'Son activé' : 'Son désactivé'}
                      className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border transition-colors ${
                        state.preferences.soundEnabled
                          ? 'border-[#1B5E48]/25 bg-[#1B5E48]/10 text-[#1B5E48] dark:border-[#34A87E]/30 dark:bg-[#34A87E]/15 dark:text-[#34A87E]'
                          : 'border-[#132A23]/12 bg-[#F7F8F6] text-[#132A23]/55 dark:border-[#EBF0ED]/12 dark:bg-[#0C1210] dark:text-[#EBF0ED]/55'
                      }`}
                    >
                      {state.preferences.soundEnabled ? (
                        <Volume2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <VolumeX className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePreference('vibrationEnabled')}
                      aria-pressed={state.preferences.vibrationEnabled}
                      title={
                        state.preferences.vibrationEnabled
                          ? 'Désactiver la vibration'
                          : 'Activer la vibration'
                      }
                      aria-label={
                        state.preferences.vibrationEnabled
                          ? 'Vibration activée'
                          : 'Vibration désactivée'
                      }
                      className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border transition-colors ${
                        state.preferences.vibrationEnabled
                          ? 'border-[#1B5E48]/25 bg-[#1B5E48]/10 text-[#1B5E48] dark:border-[#34A87E]/30 dark:bg-[#34A87E]/15 dark:text-[#34A87E]'
                          : 'border-[#132A23]/12 bg-[#F7F8F6] text-[#132A23]/55 dark:border-[#EBF0ED]/12 dark:bg-[#0C1210] dark:text-[#EBF0ED]/55'
                      }`}
                    >
                      <Smartphone className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePreference('darkMode')}
                      aria-pressed={state.preferences.darkMode}
                      title={
                        state.preferences.darkMode
                          ? 'Passer en mode clair'
                          : 'Passer en mode sombre'
                      }
                      aria-label={
                        state.preferences.darkMode
                          ? 'Mode sombre activé'
                          : 'Mode clair activé'
                      }
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[#132A23]/12 bg-[#F7F8F6] text-[#132A23]/75 transition-colors hover:text-[#132A23] dark:border-[#EBF0ED]/12 dark:bg-[#0C1210] dark:text-[#EBF0ED]/75 dark:hover:text-[#EBF0ED]"
                    >
                      {state.preferences.darkMode ? (
                        <Sun className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Moon className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* Right Column on Desktop (Summary + Quick Dhikr List) */}
              <aside className="space-y-6 lg:col-span-5">
                {/* Today's Quiet Metrics */}
                <div className="rounded-2xl border border-[#132A23]/10 bg-white p-5 dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-xl font-semibold text-[#132A23] dark:text-[#EBF0ED]">
                      Bilan du jour
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveView('historique')}
                      className="text-xs font-medium text-[#1B5E48] hover:underline dark:text-[#34A87E]"
                    >
                      Voir l’historique
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-4 border-t border-[#132A23]/8 pt-4 dark:border-[#EBF0ED]/8">
                    <div>
                      <div className="text-xs text-[#132A23]/60 dark:text-[#EBF0ED]/60">
                        Aujourd’hui
                      </div>
                      <div className="mt-1 font-mono text-xl font-semibold text-[#132A23] tabular-nums dark:text-[#EBF0ED]">
                        {todayCount.toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#132A23]/60 dark:text-[#EBF0ED]/60">
                        Cycles actifs
                      </div>
                      <div className="mt-1 font-mono text-xl font-semibold text-[#132A23] tabular-nums dark:text-[#EBF0ED]">
                        {activeProgress.cycles.toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#132A23]/60 dark:text-[#EBF0ED]/60">
                        Total global
                      </div>
                      <div className="mt-1 font-mono text-xl font-semibold text-[#132A23] tabular-nums dark:text-[#EBF0ED]">
                        {totalAllTime.toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  {/* Subtle daily goal progress inside Bilan du jour */}
                  <div className="mt-4 border-t border-[#132A23]/8 pt-3.5 dark:border-[#EBF0ED]/8">
                    <div className="flex items-center justify-between text-xs text-[#132A23]/60 tabular-nums dark:text-[#EBF0ED]/60">
                      <span>Objectif du jour</span>
                      <span>
                        {todayCount.toLocaleString('fr-FR')} / {state.preferences.dailyGoal.toLocaleString('fr-FR')}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#132A23]/8 dark:bg-[#EBF0ED]/10">
                      <div
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              todayCount > 0 ? 3 : 0,
                              Math.round((todayCount / Math.max(1, state.preferences.dailyGoal)) * 100)
                            )
                          )}%`,
                        }}
                        className={`h-full rounded-full transition-all duration-200 ${
                          todayCount >= state.preferences.dailyGoal
                            ? 'bg-[#B5893A] dark:bg-[#D4AF6A]'
                            : 'bg-[#1B5E48] dark:bg-[#34A87E]'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* PWA Install Prompt / Guide */}
                <PWAInstallButton />

                {/* Desktop Quick Invocation Switcher */}
                <div className="hidden lg:block">
                  <DhikrPanel
                    presets={allPresets}
                    activeDhikrId={activePreset.id}
                    progressById={state.progressById}
                    onSelectDhikr={handleSelectDhikr}
                    onAddCustomDhikr={handleAddCustomDhikr}
                    onDeleteCustomDhikr={handleDeleteCustomDhikr}
                  />
                </div>
              </aside>
            </div>
          )}

          {activeView === 'invocations' && (
            <div className="mx-auto max-w-3xl">
              <DhikrPanel
                presets={allPresets}
                activeDhikrId={activePreset.id}
                progressById={state.progressById}
                onSelectDhikr={handleSelectDhikr}
                onAddCustomDhikr={handleAddCustomDhikr}
                onDeleteCustomDhikr={handleDeleteCustomDhikr}
              />
            </div>
          )}

          {activeView === 'historique' && (
            <div className="mx-auto max-w-4xl">
              <HistoryPanel
                presets={allPresets}
                progressById={state.progressById}
                dailyHistory={state.dailyHistory}
                todayKey={todayKey}
                dailyGoal={state.preferences.dailyGoal}
                onUpdateDailyGoal={setDailyGoal}
                onClearHistory={handleClearHistory}
              />
            </div>
          )}
        </main>
      )}

      {/* Quiet Desktop Footer */}
      {!zenMode && (
        <footer className="hidden border-t border-[#132A23]/8 py-5 text-center text-xs text-[#132A23]/45 dark:border-[#EBF0ED]/8 dark:text-[#EBF0ED]/45 lg:block">
          Tesbih · Sauvegarde locale automatique · Raccourcis : Espace (+1), Retour arrière (-1), Échap (Épuré)
        </footer>
      )}

      {/* Mobile Bottom Tab Bar (< lg, hidden in Zen mode) */}
      {!zenMode && (
        <nav
          aria-label="Navigation mobile"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[#132A23]/10 bg-white/95 backdrop-blur-md dark:border-[#EBF0ED]/10 dark:bg-[#131C19]/95 lg:hidden"
        >
          <div className="grid h-14 grid-cols-3 items-center">
            <button
              type="button"
              onClick={() => setActiveView('compteur')}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                activeView === 'compteur'
                  ? 'text-[#1B5E48] dark:text-[#34A87E]'
                  : 'text-[#132A23]/55 dark:text-[#EBF0ED]/55'
              }`}
            >
              <CircleDot className="h-[19px] w-[19px]" aria-hidden="true" />
              <span>Compteur</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('invocations')}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                activeView === 'invocations'
                  ? 'text-[#1B5E48] dark:text-[#34A87E]'
                  : 'text-[#132A23]/55 dark:text-[#EBF0ED]/55'
              }`}
            >
              <BookOpen className="h-[19px] w-[19px]" aria-hidden="true" />
              <span>Invocations</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('historique')}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                activeView === 'historique'
                  ? 'text-[#1B5E48] dark:text-[#34A87E]'
                  : 'text-[#132A23]/55 dark:text-[#EBF0ED]/55'
              }`}
            >
              <BarChart3 className="h-[19px] w-[19px]" aria-hidden="true" />
              <span>Historique</span>
            </button>
          </div>
        </nav>
      )}

      <OfflineIndicator />
    </div>
  );
}
