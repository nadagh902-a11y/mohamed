import { Check, Copy, Download, Share, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked in some embedded contexts
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-[#132A23]/10 bg-white p-4 dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#132A23] dark:text-[#EBF0ED]">
              Installer sur téléphone
            </h3>
            <p className="mt-0.5 text-xs text-[#132A23]/60 dark:text-[#EBF0ED]/60">
              Utilisable hors ligne comme une application native
            </p>
          </div>

          {isInstallable ? (
            <button
              type="button"
              onClick={install}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#1B5E48] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#154A39] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5E48] dark:bg-[#34A87E] dark:text-[#0C1210] dark:hover:bg-[#2C936E] whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Installer</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#132A23]/15 bg-[#F7F8F6] px-3.5 py-2 text-xs font-medium text-[#132A23] transition-colors hover:bg-[#132A23]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B5E48] dark:border-[#EBF0ED]/15 dark:bg-[#0C1210] dark:text-[#EBF0ED] dark:hover:bg-[#EBF0ED]/10 whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Comment installer</span>
            </button>
          )}
        </div>
      </div>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-xs sm:items-center"
        >
          <div className="w-full max-w-md rounded-3xl border border-[#132A23]/10 bg-white p-6 shadow-xl dark:border-[#EBF0ED]/10 dark:bg-[#131C19]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3
                  id="pwa-guide-title"
                  className="font-display text-2xl font-semibold text-[#132A23] dark:text-[#EBF0ED]"
                >
                  Installer sur votre téléphone
                </h3>
                <p className="mt-1 text-xs text-[#132A23]/60 dark:text-[#EBF0ED]/60">
                  Ajoutez Tesbih à votre écran d’accueil sans passer par un store
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Fermer"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-[#132A23]/60 hover:bg-[#132A23]/5 dark:text-[#EBF0ED]/60 dark:hover:bg-[#EBF0ED]/10"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-[#132A23]/85 dark:text-[#EBF0ED]/85">
              {isIOS ? (
                <div className="rounded-2xl border border-[#132A23]/10 bg-[#F7F8F6] p-4 dark:border-[#EBF0ED]/10 dark:bg-[#0C1210]">
                  <div className="flex items-center gap-2 font-semibold text-[#132A23] dark:text-[#EBF0ED]">
                    <Share className="h-4 w-4 text-[#1B5E48] dark:text-[#34A87E]" aria-hidden="true" />
                    <span>Sur iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="mt-2.5 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-[#132A23]/75 dark:text-[#EBF0ED]/75">
                    <li>Ouvrez cette application directement dans <strong>Safari</strong>.</li>
                    <li>Touchez le bouton <strong>Partager</strong> (carré avec flèche vers le haut) en bas de l’écran.</li>
                    <li>Faites défiler et touchez <strong>Sur l’écran d’accueil</strong>, puis <strong>Ajouter</strong>.</li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-[#132A23]/10 bg-[#F7F8F6] p-4 dark:border-[#EBF0ED]/10 dark:bg-[#0C1210]">
                    <div className="font-semibold text-[#132A23] dark:text-[#EBF0ED]">
                      Sur Android (Google Chrome)
                    </div>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-[#132A23]/75 dark:text-[#EBF0ED]/75">
                      <li>Ouvrez le lien de l’application dans <strong>Chrome</strong> sur votre téléphone.</li>
                      <li>Touchez le menu <strong>⋮</strong> en haut à droite.</li>
                      <li>Sélectionnez <strong>Installer l’application</strong> (ou <strong>Ajouter à l’écran d’accueil</strong>).</li>
                    </ol>
                  </div>

                  <div className="rounded-2xl border border-[#132A23]/10 bg-[#F7F8F6] p-4 dark:border-[#EBF0ED]/10 dark:bg-[#0C1210]">
                    <div className="font-semibold text-[#132A23] dark:text-[#EBF0ED]">
                      Sur iPhone (Safari)
                    </div>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-[#132A23]/75 dark:text-[#EBF0ED]/75">
                      <li>Ouvrez le lien dans <strong>Safari</strong>.</li>
                      <li>Touchez <strong>Partager</strong> puis <strong>Sur l’écran d’accueil</strong>.</li>
                    </ol>
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#132A23]/15 px-4 py-2 text-xs font-medium text-[#132A23] hover:bg-[#132A23]/5 dark:border-[#EBF0ED]/15 dark:text-[#EBF0ED] dark:hover:bg-[#EBF0ED]/10"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#1B5E48] dark:text-[#34A87E]" aria-hidden="true" />
                    <span>Lien copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copier le lien</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[42px] rounded-xl bg-[#1B5E48] px-5 py-2 text-xs font-medium text-white hover:bg-[#154A39] dark:bg-[#34A87E] dark:text-[#0C1210] dark:hover:bg-[#2C936E]"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
