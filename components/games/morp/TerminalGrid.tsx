'use client';

import type { ReactNode } from 'react';
import type { SystemId } from '@/lib/games/morp/types';

interface TerminalGridProps {
  unlockedSystems: SystemId[];
  activePanel: SystemId;
  onPanelChange: (panel: SystemId) => void;
  chatPanel: ReactNode;
  sidePanels: Partial<Record<SystemId, ReactNode>>;
  stageKey?: string;
}

const PANEL_ORDER: SystemId[] = [
  'prediction',
  'prompt',
  'memory',
  'context',
  'verification',
  'recursion',
  'repair'
];

export default function TerminalGrid({
  unlockedSystems,
  activePanel,
  onPanelChange,
  chatPanel,
  sidePanels,
  stageKey
}: TerminalGridProps) {
  const availablePanels = PANEL_ORDER.filter((p) => unlockedSystems.includes(p));

  return (
    <div className="morp-terminal">
      <div className="morp-terminal__main">{chatPanel}</div>
      {availablePanels.length > 0 && (
        <div className="morp-terminal__side">
          <nav className="morp-terminal__tabs" aria-label="Diagnostic panels">
            {availablePanels.map((panel) => (
              <button
                key={panel}
                type="button"
                className={`morp-terminal__tab${activePanel === panel ? ' morp-terminal__tab--active' : ''}`}
                onClick={() => onPanelChange(panel)}
                aria-pressed={activePanel === panel}
              >
                {panel.toUpperCase()}
              </button>
            ))}
          </nav>
          <div className="morp-terminal__panel-content" key={stageKey}>
            {sidePanels[activePanel] ?? (
              <p className="morp-terminal__empty">Select a diagnostic panel.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
