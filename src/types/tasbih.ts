export type BeadMaterialId = 'jade' | 'olivier' | 'onyx' | 'ambre';

export interface BeadMaterial {
  id: BeadMaterialId;
  label: string;
  beadFill: string;
  beadHighlight: string;
  beadStroke: string;
  dividerFill: string;
  cordColor: string;
  darkBeadFill: string;
  darkBeadHighlight: string;
  darkBeadStroke: string;
  darkDividerFill: string;
  darkCordColor: string;
}

export interface SequenceStep {
  label: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  target: number;
}

export interface DhikrPreset {
  id: string;
  title: string;
  arabic: string;
  transliteration: string;
  meaning: string;
  defaultTarget: number; // 0 represents infinite mode
  isCustom?: boolean;
  sequence?: SequenceStep[];
}

export interface DhikrProgress {
  count: number;
  cycles: number;
  totalAllTime: number;
  sequenceStepIndex?: number;
}

export interface DailyHistoryEntry {
  date: string; // YYYY-MM-DD
  total: number;
}

export type AppView = 'compteur' | 'invocations' | 'historique';

export interface TasbihPreferences {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  darkMode: boolean;
  beadMaterial: BeadMaterialId;
  autoAdvanceCycle: boolean;
  dailyGoal: number;
}
