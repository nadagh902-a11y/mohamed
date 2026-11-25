import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 left-4 z-40 flex items-center gap-2 rounded-xl border border-[#B5893A]/35 bg-white px-3.5 py-2 text-xs font-medium text-[#132A23] shadow-md dark:border-[#D4AF6A]/35 dark:bg-[#131C19] dark:text-[#EBF0ED] lg:bottom-4"
    >
      <WifiOff className="h-3.5 w-3.5 text-[#B5893A] dark:text-[#D4AF6A]" aria-hidden="true" />
      <span>Mode hors ligne · Sauvegarde locale active</span>
    </div>
  );
}
