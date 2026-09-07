'use client';

import { useEffect, useState } from 'react';

function useLocalDevHost(): boolean {
  const [isLocalDev, setIsLocalDev] = useState(false);

  useEffect(() => {
    setIsLocalDev(window.location.host === 'localhost:3000');
  }, []);

  return isLocalDev;
}

interface DebugUnlockButtonProps {
  onUnlock: () => void;
}

export default function DebugUnlockButton({ onUnlock }: DebugUnlockButtonProps) {
  const isLocalDev = useLocalDevHost();

  if (!isLocalDev) {
    return null;
  }

  return (
    <button
      type="button"
      className="morp-debug-unlock"
      onClick={onUnlock}
      aria-label="Unlock all stages (debug)"
      title="Unlock all stages (debug)"
    >
      Unlock stages
    </button>
  );
}
