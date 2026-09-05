'use client';

import { SIMULATED_CONTEXT_LIMIT } from '@/lib/games/morp/config';
import type { ContextCompactionResult, ContextualAction, StageAction } from '@/lib/games/morp/types';
import ContextTools from './ContextTools';

interface ContextPanelProps {
  tokensUsed: number;
  sentTokens: number;
  droppedMessageCount: number;
  overflowed: boolean;
  memoryMessageCount: number;
  lastCompaction: ContextCompactionResult | null;
  summarizing: boolean;
  tools: ContextualAction[];
  onToolAction: (action: StageAction) => void;
  toolsDisabled?: boolean;
}

function formatCompaction(compaction: ContextCompactionResult): string {
  const label = compaction.strategy === 'truncate' ? 'Truncated' : 'Summarized';
  const llmNote = compaction.strategy === 'summarize' && compaction.usedLlm ? ' (LLM)' : '';
  const saved =
    compaction.tokensSaved > 0
      ? `, saved ${compaction.tokensSaved.toLocaleString()} tokens`
      : ', no token savings';

  return `${label}${llmNote}: ${compaction.tokensBefore.toLocaleString()} → ${compaction.tokensAfter.toLocaleString()} tokens${saved}; ${compaction.messagesBefore} → ${compaction.messagesAfter} messages`;
}

export default function ContextPanel({
  tokensUsed,
  sentTokens,
  droppedMessageCount,
  overflowed,
  memoryMessageCount,
  lastCompaction,
  summarizing,
  tools,
  onToolAction,
  toolsDisabled = false
}: ContextPanelProps) {
  const percent = Math.min(100, Math.round((tokensUsed / SIMULATED_CONTEXT_LIMIT) * 100));

  return (
    <section className="morp-panel morp-panel--context" aria-labelledby="context-heading">
      <header className="morp-panel__header">
        <h3 id="context-heading">CONTEXT WINDOW</h3>
      </header>
      <p>
        CURRENT CONTEXT: {tokensUsed.toLocaleString()} / {SIMULATED_CONTEXT_LIMIT.toLocaleString()} TOKENS
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
      <p className="morp-context__note">
        The model can only accept a maximum of {SIMULATED_CONTEXT_LIMIT.toLocaleString()} tokens at a time. Once this limit is reached further calls to the LLM will fail.
      </p>
      {memoryMessageCount > 0 && (
        <p className="morp-context__memory" aria-live="polite">
          MEMORY: {memoryMessageCount} offloaded message{memoryMessageCount === 1 ? '' : 's'} can be accessed by the LLM as needed
          . By querying and retrieving messages only as needed you don't have to add it all to the prompt and minimize the impact to the context window. However, this querying takes time and is not free.
        </p>
      )}
      {overflowed && (
        <>
          <p className="morp-context__warning" role="alert">
            CONTEXT OVERFLOW
          </p>
          <p>
            The LLM will reject calls that exceed its context window limits. You must use a context management strategy to manage the size of the context window. Each has advantages and disadvantages.
          </p>
        </>
      )}
      {summarizing && (
        <p className="morp-context__status" aria-live="polite">
          Generating summary with the model...
        </p>
      )}
      {lastCompaction && !summarizing && (
        <p className="morp-context__compaction" aria-live="polite">
          {formatCompaction(lastCompaction)}
        </p>
      )}
      <div className="morp-context__tools">
        {tools.length > 0 ? (
          <ContextTools tools={tools} onAction={onToolAction} disabled={toolsDisabled} />
        ) : (
          <p className="morp-context__tools-hint">Recovery tools unlock after overflow.</p>
        )}
      </div>
    </section>
  );
}
