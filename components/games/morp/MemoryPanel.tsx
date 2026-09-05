'use client';

import { MEMORY_CAPACITY } from '@/lib/games/morp/config';
import type { MemoryEntry } from '@/lib/games/morp/types';

interface MemoryPanelProps {
  memories: MemoryEntry[];
  onToggleContext: (id: string, inContext: boolean) => void;
  onDelete: (id: string) => void;
}

export default function MemoryPanel({ memories, onToggleContext, onDelete }: MemoryPanelProps) {
  return (
    <section className="morp-panel morp-panel--memory" aria-labelledby="memory-heading">
      <header className="morp-panel__header">
        <h3 id="memory-heading">MORP MEMORY</h3>
      </header>
      <h4>KNOWN FACTS</h4>
      <ul className="morp-memory__list">
        {memories.map((memory) => (
          <li key={memory.id} className="morp-memory__item">
            <div className="morp-memory__fact">
              <strong>{memory.key}</strong>
              <span>{memory.value}</span>
            </div>
            <div className="morp-memory__actions">
              <div className="morp-control">
                <input
                  type="checkbox"
                  id={`memory-context-${memory.id}`}
                  checked={memory.inContext}
                  onChange={(e) => onToggleContext(memory.id, e.target.checked)}
                />
                <label htmlFor={`memory-context-${memory.id}`}>In context</label>
              </div>
              <button type="button" className="button small alt" onClick={() => onDelete(memory.id)}>
                DELETE
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="morp-memory__count">
        MEMORY ENTRIES: {memories.length} / {MEMORY_CAPACITY}
      </p>
    </section>
  );
}
