'use client';

import { SIMULATED_CONTEXT_LIMIT } from '@/lib/games/morp/config';
import type { ContextMessage } from '@/lib/games/morp/types';

interface ContextPanelProps {
  messages: ContextMessage[];
  tokensUsed: number;
  overflowed: boolean;
}

export default function ContextPanel({ messages, tokensUsed, overflowed }: ContextPanelProps) {
  const percent = Math.min(100, Math.round((tokensUsed / SIMULATED_CONTEXT_LIMIT) * 100));
  const active = messages.filter((m) => !m.removed);

  return (
    <section className="morp-panel morp-panel--context" aria-labelledby="context-heading">
      <header className="morp-panel__header">
        <h3 id="context-heading">CONTEXT WINDOW</h3>
      </header>
      <p>
        USED: {tokensUsed.toLocaleString()} / {SIMULATED_CONTEXT_LIMIT.toLocaleString()} TOKENS
      </p>
      <div
        className={`morp-context__bar${overflowed ? ' morp-context__bar--overflow' : ''}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Context window ${percent} percent full`}
      >
        <div className="morp-context__bar-fill" style={{ width: `${percent}%` }} />
      </div>
      {overflowed && (
        <p className="morp-context__warning" role="alert">
          CONTEXT OVERFLOW — older messages removed
        </p>
      )}
      <ul className="morp-context__messages">
        {active.map((message) => (
          <li key={message.id} className={`morp-context__message morp-context__message--${message.role}`}>
            <span className="morp-context__role">{message.role.toUpperCase()}</span>
            <span>{message.content.slice(0, 80)}{message.content.length > 80 ? '...' : ''}</span>
            <span className="morp-context__tokens">{message.tokens}t</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
