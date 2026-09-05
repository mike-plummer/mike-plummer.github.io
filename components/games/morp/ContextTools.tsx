'use client';

import type { ContextualAction, StageAction } from '@/lib/games/morp/types';

interface ContextToolsProps {
  tools: ContextualAction[];
  onAction: (action: StageAction) => void;
  disabled?: boolean;
}

export default function ContextTools({ tools, onAction, disabled = false }: ContextToolsProps) {
  if (tools.length === 0) {
    return null;
  }

  return (
    <div className="morp-context-tools" role="group" aria-label="Context recovery tools">
      {tools.map((tool) => (
        <article key={tool.id} className="morp-context-tools__card">
          <button
            type="button"
            className="button small alt morp-context-tools__button"
            disabled={disabled}
            onClick={() => onAction(tool.action)}
          >
            {tool.label}
          </button>
          <div className="morp-context-tools__tradeoffs">
            {tool.pro && (
              <p className="morp-context-tools__pro">
                <span className="morp-context-tools__label">Pro</span>
                {tool.pro}
              </p>
            )}
            {tool.con && (
              <p className="morp-context-tools__con">
                <span className="morp-context-tools__label">Con</span>
                {tool.con}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
