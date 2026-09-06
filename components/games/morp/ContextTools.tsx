'use client';

import type { ContextualAction, StageAction } from '@/lib/games/morp/types';

interface ContextToolsProps {
  tools: ContextualAction[];
  onAction: (action: StageAction) => void;
  disabled?: boolean;
}

function Tradeoffs({ pro, con }: { pro?: string; con?: string }) {
  if (!pro && !con) {
    return null;
  }

  return (
    <div className="morp-context-tools__tradeoffs">
      {pro && (
        <p className="morp-context-tools__pro">
          <span className="morp-context-tools__label">Pro</span>
          {pro}
        </p>
      )}
      {con && (
        <p className="morp-context-tools__con">
          <span className="morp-context-tools__label">Con</span>
          {con}
        </p>
      )}
    </div>
  );
}

export default function ContextTools({ tools, onAction, disabled = false }: ContextToolsProps) {
  if (tools.length === 0) {
    return null;
  }

  return (
    <fieldset className="morp-context-tools" aria-label="Context recovery tools">
      {tools.map((tool) => {
        const secondary = tool.secondaryAction;

        return (
          <article key={tool.id} className="morp-context-tools__card">
            <button
              type="button"
              className="button small alt morp-context-tools__button"
              disabled={disabled}
              onClick={() => onAction(tool.action)}
            >
              {tool.label}
            </button>
            <Tradeoffs pro={tool.pro} con={tool.con} />
            {secondary ? (
              <div className="morp-context-tools__footer">
                <button
                  type="button"
                  className="button small alt morp-context-tools__button"
                  disabled={disabled}
                  onClick={() => onAction(secondary.action)}
                >
                  {secondary.label}
                </button>
                <Tradeoffs pro={secondary.pro} con={secondary.con} />
              </div>
            ) : null}
          </article>
        );
      })}
    </fieldset>
  );
}
