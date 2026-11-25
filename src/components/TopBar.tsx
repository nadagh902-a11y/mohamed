import { Maximize2, Minimize2 } from 'lucide-react';
import { AppView } from '../types/tasbih';

interface TopBarProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
}

const NAV_ITEMS: { id: AppView; label: string }[] = [
  { id: 'compteur', label: 'Compteur' },
  { id: 'invocations', label: 'Invocations' },
  { id: 'historique', label: 'Historique' },
];

export function TopBar({
  activeView,
  onSelectView,
  zenMode,
  onToggleZenMode,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#132A23]/10 bg-[#F7F8F6]/90 backdrop-blur-md dark:border-[#EBF0ED]/10 dark:bg-[#0C1210]/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            if (zenMode) onToggleZenMode();
            onSelectView('compteur');
          }}
          className="font-display text-2xl font-semibold tracking-tight text-[#132A23] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B5E48] dark:text-[#EBF0ED] dark:focus-visible:outline-[#34A87E] whitespace-nowrap shrink-0"
        >
          Tesbih
        </button>

        {/* Zone 2: Clean single-line navigation links (hidden on mobile where bottom tab bar is used, and hidden in Zen mode) */}
        {!zenMode ? (
          <nav
            aria-label="Navigation principale"
            className="hidden lg:flex items-center gap-7 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  className={`relative py-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B5E48] dark:focus-visible:outline-[#34A87E] ${
                    isActive
                      ? 'text-[#132A23] dark:text-[#EBF0ED]'
                      : 'text-[#132A23]/60 hover:text-[#132A23] dark:text-[#EBF0ED]/60 dark:hover:text-[#EBF0ED]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-[#1B5E48] dark:bg-[#34A87E]"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onToggleZenMode}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-[#132A23]/15 bg-white px-4 py-2 text-xs font-medium text-[#132A23] transition-colors hover:bg-[#132A23]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5E48] dark:border-[#EBF0ED]/15 dark:bg-[#131C19] dark:text-[#EBF0ED] dark:hover:bg-[#EBF0ED]/10 dark:focus-visible:outline-[#34A87E] whitespace-nowrap shrink-0"
          >
            {zenMode ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Quitter épuré</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Mode épuré</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
