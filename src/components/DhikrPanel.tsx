import { Plus, Trash2, Check } from 'lucide-react';
import { useState } from 'react';
import { DhikrPreset, DhikrProgress } from '../types/tasbih';

interface DhikrPanelProps {
  presets: DhikrPreset[];
  activeDhikrId: string;
  progressById: Record<string, DhikrProgress>;
  onSelectDhikr: (id: string) => void;
  onAddCustomDhikr: (item: Omit<DhikrPreset, 'id' | 'isCustom'>) => void;
  onDeleteCustomDhikr: (id: string) => void;
}

export function DhikrPanel({
  presets,
  activeDhikrId,
  progressById,
  onSelectDhikr,
  onAddCustomDhikr,
  onDeleteCustomDhikr,
}: DhikrPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [meaning, setMeaning] = useState('');
  const [target, setTarget] = useState<number>(33);
  const [customTargetInput, setCustomTargetInput] = useState('33');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = typedText.trim();
    if (!trimmed) {
      setError('Veuillez écrire votre tasbih (en arabe ou en français).');
      return;
    }

    const hasArabic = /[\u0600-\u06FF]/.test(trimmed);
    const parsedTarget =
      target === -1 ? Math.max(1, parseInt(customTargetInput, 10) || 33) : target;

    onAddCustomDhikr({
      title: trimmed,
      arabic: hasArabic ? trimmed : '',
      transliteration: '',
      meaning: meaning.trim() || 'Tasbih personnalisé',
      defaultTarget: parsedTarget,
    });

    setTypedText('');
    setMeaning('');
    setTarget(33);
    setCustomTargetInput('33');
    setError('');
    setIsCreating(false);
  };

  return (
    <section aria-labelledby="dhikr-panel-heading" className="flex flex-col">
      <div className="flex items-center justify-between gap-4 pb-4">
        <div>
          <h2
            id="dhikr-panel-heading"
            className="font-display text-2xl font-semibold tracking-tight text-[#132A23] dark:text-[#EBF0ED]"
          >
            Invocations
          </h2>
          <p className="mt-0.5 text-xs text-[#132A23]/60 dark:text-[#EBF0ED]/60">
            Sélectionnez ou écrivez votre propre tasbih
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating((prev) => !prev)}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#132A23]/15 bg-white px-4 py-2 text-xs font-medium text-[#132A23] transition-colors hover:bg-[#132A23]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5E48] dark:border-[#EBF0ED]/15 dark:bg-[#131C19] dark:text-[#EBF0ED] dark:hover:bg-[#EBF0ED]/10 dark:focus-visible:outline-[#34A87E] whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{isCreating ? 'Fermer' : 'Écrire un tasbih'}</span>
        </button>
      </div>

      {/* Inline Custom Dhikr Creator */}
      {isCreating && (
        <form
          onSubmit={handleSubmit}
          className="mb-5 rounded-2xl border border-[#132A23]/12 bg-white p-4 dark:border-[#EBF0ED]/12 dark:bg-[#131C19]"
        >
          <h3 className="text-sm font-semibold text-[#132A23] dark:text-[#EBF0ED]">
            Ajouter un tasbih en écrivant
          </h3>

          <div className="mt-3 space-y-3">
            <div>
              <label
                htmlFor="custom-dhikr-text"
                className="block text-xs font-medium text-[#132A23]/75 dark:text-[#EBF0ED]/75"
              >
                Écrivez votre tasbih (en arabe ou en français) *
              </label>
              <input
                id="custom-dhikr-text"
                type="text"
                dir="auto"
                value={typedText}
                onChange={(e) => {
                  setTypedText(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Ex. : سبحان الله وبحمده ou SubhanAllah"
                className="mt-1 w-full rounded-xl border border-[#132A23]/15 bg-[#F7F8F6] px-3 py-2.5 text-base text-[#132A23] placeholder:text-[#132A23]/40 focus:border-[#1B5E48] focus:outline-none dark:border-[#EBF0ED]/15 dark:bg-[#0C1210] dark:text-[#EBF0ED] dark:placeholder:text-[#EBF0ED]/35 dark:focus:border-[#34A87E]"
              />
            </div>

            <div>
              <label
                htmlFor="custom-dhikr-meaning"
                className="block text-xs font-medium text-[#132A23]/75 dark:text-[#EBF0ED]/75"
              >
                Traduction ou note (optionnel)
              </label>
              <input
                id="custom-dhikr-meaning"
                type="text"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="Ex. : Gloire et louange à Allah"
                className="mt-1 w-full rounded-xl border border-[#132A23]/15 bg-[#F7F8F6] px-3 py-2.5 text-sm text-[#132A23] placeholder:text-[#132A23]/40 focus:border-[#1B5E48] focus:outline-none dark:border-[#EBF0ED]/15 dark:bg-[#0C1210] dark:text-[#EBF0ED] dark:placeholder:text-[#EBF0ED]/35 dark:focus:border-[#34A87E]"
              />
            </div>

            <div>
              <span className="block text-xs font-medium text-[#132A23]/75 dark:text-[#EBF0ED]/75">
                Objectif par cycle
              </span>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {[
                  { val: 33, label: '33' },
                  { val: 99, label: '99' },
                  { val: 100, label: '100' },
                  { val: 0, label: 'Libre' },
                  { val: -1, label: 'Autre' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setTarget(opt.val)}
                    className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      target === opt.val
                        ? 'bg-[#1B5E48] text-white dark:bg-[#34A87E] dark:text-[#0C1210]'
                        : 'bg-[#132A23]/5 text-[#132A23]/75 hover:bg-[#132A23]/10 dark:bg-[#EBF0ED]/8 dark:text-[#EBF0ED]/75 dark:hover:bg-[#EBF0ED]/15'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {target === -1 && (
                  <input
                    type="number"
                    min={1}
                    max={99999}
                    value={customTargetInput}
                    onChange={(e) => setCustomTargetInput(e.target.value)}
                    aria-label="Objectif personnalisé"
                    className="w-20 rounded-lg border border-[#132A23]/15 bg-[#F7F8F6] px-2.5 py-1.5 font-mono text-xs text-[#132A23] tabular-nums focus:border-[#1B5E48] focus:outline-none dark:border-[#EBF0ED]/15 dark:bg-[#0C1210] dark:text-[#EBF0ED]"
                  />
                )}
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setError('');
                }}
                className="min-h-[40px] rounded-xl px-4 py-2 text-xs font-medium text-[#132A23]/70 hover:bg-[#132A23]/5 dark:text-[#EBF0ED]/70 dark:hover:bg-[#EBF0ED]/10"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="min-h-[40px] rounded-xl bg-[#1B5E48] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#154A39] dark:bg-[#34A87E] dark:text-[#0C1210] dark:hover:bg-[#2C936E]"
              >
                Ajouter et compter
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Dhikr List */}
      <div className="overflow-hidden rounded-2xl border border-[#132A23]/10 bg-white dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
        <ul className="divide-y divide-[#132A23]/8 dark:divide-[#EBF0ED]/8">
          {presets.map((item) => {
            const isActive = item.id === activeDhikrId;
            const prog = progressById[item.id];
            const total = prog?.totalAllTime ?? 0;
            const currentCount = prog?.count ?? 0;

            return (
              <li key={item.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onSelectDhikr(item.id)}
                  className={`flex min-h-[64px] flex-1 items-center justify-between gap-4 px-4 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1B5E48] dark:focus-visible:outline-[#34A87E] ${
                    isActive
                      ? 'bg-[#1B5E48]/[0.06] dark:bg-[#34A87E]/[0.1]'
                      : 'hover:bg-[#132A23]/[0.025] dark:hover:bg-[#EBF0ED]/[0.03]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        dir="auto"
                        className={`truncate text-sm font-semibold ${
                          isActive
                            ? 'text-[#1B5E48] dark:text-[#34A87E]'
                            : 'text-[#132A23] dark:text-[#EBF0ED]'
                        }`}
                      >
                        {item.title}
                      </span>
                      {isActive && (
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-[#1B5E48] dark:text-[#34A87E]"
                          aria-label="Actif"
                        />
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#132A23]/55 dark:text-[#EBF0ED]/55">
                      <span className="tabular-nums">
                        {item.sequence
                          ? 'Séquence 33×3+1'
                          : item.defaultTarget > 0
                            ? `${item.defaultTarget} grains`
                            : 'Libre'}
                      </span>
                      {currentCount > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums font-medium text-[#132A23]/75 dark:text-[#EBF0ED]/75">
                            En cours : {currentCount}
                          </span>
                        </>
                      )}
                      {total > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {total.toLocaleString('fr-FR')} au total
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {item.arabic && item.arabic !== item.title && (
                    <span
                      dir="rtl"
                      className="shrink-0 font-arabic text-lg text-[#132A23]/85 dark:text-[#EBF0ED]/85"
                    >
                      {item.arabic.split('·')[0].trim()}
                    </span>
                  )}
                </button>

                {item.isCustom && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomDhikr(item.id)}
                    aria-label={`Supprimer ${item.title}`}
                    className="mr-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#132A23]/40 transition-colors hover:bg-red-500/10 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-[#1B5E48] dark:text-[#EBF0ED]/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
