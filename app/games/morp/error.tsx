'use client';

import { useEffect } from 'react';
import { CHECKPOINT_KEY } from '@/lib/games/morp/config';

export default function MorpError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('MORP game error:', error);
  }, [error]);

  function handleResetProgress() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CHECKPOINT_KEY);
      window.location.reload();
    }
  }

  return (
    <div className="morp-game">
      <div className="morp-boot morp-boot--error" role="alert">
        <div className="morp-boot__frame">
          <h2>Diagnostic terminal error</h2>
          <p>Something went wrong while running the MORP diagnostic terminal.</p>
          <div className="morp-boot__actions">
            <button type="button" className="button small" onClick={reset}>
              Try again
            </button>
            <button type="button" className="button small alt" onClick={handleResetProgress}>
              Reset progress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
