'use client';

import type { ContextualAction } from '@/lib/games/morp/types';

interface ContextualActionsProps {
  actions: ContextualAction[];
  onAction: (action: ContextualAction['action']) => void;
  disabled?: boolean;
}

export default function ContextualActions({ actions, onAction, disabled = false }: ContextualActionsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="morp-actions" aria-label="Contextual tools">
      {actions.map((item) => (
        <button
          key={item.id}
          type="button"
          className="button small alt"
          disabled={disabled}
          onClick={() => onAction(item.action)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
