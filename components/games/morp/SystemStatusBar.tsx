'use client';

import { COPY } from '@/lib/games/morp/copy';
import type { MorpState, SystemId } from '@/lib/games/morp/types';

const ALL_SYSTEMS: SystemId[] = [
  'chat',
  'prediction',
  'prompt',
  'memory',
  'context',
  'verification',
  'recursion',
  'repair'
];

function getSystemStatus(state: MorpState, system: SystemId): string {
  if (!state.unlockedSystems.includes(system)) {
    return COPY.status.locked;
  }

  if (state.completedStages.includes(system as MorpState['stage'])) {
    if (system === 'recursion') return COPY.status.limited;
    if (system === 'verification') return COPY.status.enabled;
    return COPY.status.stable;
  }

  if (system === 'verification' && state.unlockedSystems.includes('verification')) {
    return COPY.status.enabled;
  }

  return COPY.status.online;
}

export default function SystemStatusBar({ state }: { state: MorpState }) {
  return (
    <div className="morp-status" aria-label="System status">
      {ALL_SYSTEMS.map((system) => {
        const status = getSystemStatus(state, system);
        const unlocked = state.unlockedSystems.includes(system);
        return (
          <div
            key={system}
            className={`morp-status__item${unlocked ? ' morp-status__item--online' : ''}`}
          >
            <span className="morp-status__label">{COPY.systems[system]}:</span>
            <span className="morp-status__value">{status}</span>
          </div>
        );
      })}
    </div>
  );
}
