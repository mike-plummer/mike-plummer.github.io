'use client';

import { MEMORY_CAPACITY } from '@/lib/games/morp/config';
import type { ContextMessage, MemoryEntry } from '@/lib/games/morp/types';

interface MemoryPanelProps {
  memories: MemoryEntry[];
  contextMemory: ContextMessage[];
  onToggleContext: (id: string, inContext: boolean) => void;
  onDelete: (id: string) => void;
}

export default function MemoryPanel({
  memories,
  contextMemory,
  onToggleContext,
  onDelete
}: MemoryPanelProps) {
  const offloadedMessages = contextMemory.filter((message) => !message.removed);

  return (
    <section className="morp-panel morp-panel--memory" aria-labelledby="memory-heading">
      <header className="morp-panel__header">
        <h3 id="memory-heading">MORP MEMORY</h3>
      </header>

      {offloadedMessages.length > 0 && (
        <>
          <h4>OFFLOADED CONTEXT</h4>
          <p className="morp-memory__note">
            {offloadedMessages.length} message{offloadedMessages.length === 1 ? '' : 's'} stored outside
            the context window and injected on each model call.
          </p>
          <ul className="morp-memory__list morp-memory__list--context">
            {offloadedMessages.map((message) => (
              <li key={message.id} className="morp-memory__item morp-memory__item--context">
                <div className="morp-memory__fact">
                  <strong>{message.role}</strong>
                  <span>{message.content}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

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
