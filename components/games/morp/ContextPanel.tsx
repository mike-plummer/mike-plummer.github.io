'use client';

import { useState } from 'react';
import { SIMULATED_CONTEXT_LIMIT } from '@/lib/games/morp/config';
import { getActiveContextMessages } from '@/lib/games/morp/modules/context-manager';
import type {
  ContextCompactionResult,
  ContextMessage,
  ContextualAction,
  StageAction
} from '@/lib/games/morp/types';
import ContextTools from './ContextTools';

interface ContextPanelProps {
  tokensUsed: number;
  sentTokens: number;
  droppedMessageCount: number;
  overflowed: boolean;
  contextMessages: ContextMessage[];
  contextMemory: ContextMessage[];
  includedMessageIds: string[];
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
    compaction.tokensSaved > 0 ? `, saved ${compaction.tokensSaved.toLocaleString()} tokens` : ', no token savings';

  return `${label}${llmNote}: ${compaction.tokensBefore.toLocaleString()} → ${compaction.tokensAfter.toLocaleString()} tokens${saved}; ${compaction.messagesBefore} → ${compaction.messagesAfter} messages`;
}

function formatRoleLabel(message: ContextMessage): string {
  if (message.summary) {
    return 'summary';
  }
  return message.role;
}

interface ContextMessageListProps {
  messages: ContextMessage[];
  emptyLabel: string;
  includedIds?: Set<string>;
  showExcludedState?: boolean;
}

function ContextMessageList({
  messages,
  emptyLabel,
  includedIds,
  showExcludedState = false
}: ContextMessageListProps) {
  if (messages.length === 0) {
    return <p className="morp-context__empty">{emptyLabel}</p>;
  }

  return (
    <ul className="morp-context__message-list">
      {messages.map((message) => {
        const excluded = showExcludedState && includedIds !== undefined && !includedIds.has(message.id);

        return (
          <li
            key={message.id}
            className={[
              'morp-context__message',
              message.summary && 'morp-context__message--summary',
              excluded && 'morp-context__message--excluded'
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div className="morp-context__message-meta">
              <span className="morp-context__message-role">{formatRoleLabel(message)}</span>
              <span className="morp-context__message-tokens">{message.tokens} tok</span>
            </div>
            <p className="morp-context__message-content">{message.content}</p>
            {excluded && <p className="morp-context__message-note">Not sent to model on next call</p>}
          </li>
        );
      })}
    </ul>
  );
}

export default function ContextPanel({
  tokensUsed,
  sentTokens,
  droppedMessageCount,
  overflowed,
  contextMessages,
  contextMemory,
  includedMessageIds,
  memoryMessageCount,
  lastCompaction,
  summarizing,
  tools,
  onToolAction,
  toolsDisabled = false
}: ContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const percent = Math.min(100, Math.round((tokensUsed / SIMULATED_CONTEXT_LIMIT) * 100));
  const activeContext = getActiveContextMessages(contextMessages);
  const activeMemory = getActiveContextMessages(contextMemory);
  const includedIds = new Set(includedMessageIds);

  const progressBar = (
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
  );

  return (
    <section className="morp-panel morp-panel--context" aria-labelledby="context-heading">
      <header className="morp-panel__header">
        <h3 id="context-heading">CONTEXT WINDOW</h3>
      </header>

      <div
        className={`morp-context__current${expanded ? ' morp-context__current--expanded' : ' morp-context__current--collapsed'}`}
      >
        <button
          type="button"
          className="morp-context__current-toggle"
          onClick={() => setExpanded(true)}
          aria-expanded={expanded}
          aria-controls="context-current-details"
        >
          <span className="morp-context__current-label">
            CURRENT CONTEXT: {tokensUsed.toLocaleString()} / {SIMULATED_CONTEXT_LIMIT.toLocaleString()} TOKENS
            {progressBar}
          </span>
          <span className="morp-context__current-hint">Show buffer</span>
        </button>

        <div className="morp-context__current-head">
          <div className="morp-context__current-header" aria-hidden={!expanded}>
            <span className="morp-context__current-label">
              CURRENT CONTEXT: {tokensUsed.toLocaleString()} / {SIMULATED_CONTEXT_LIMIT.toLocaleString()} TOKENS
              {progressBar}
            </span>
            <button
              type="button"
              className="button small alt morp-context__collapse"
              onClick={() => setExpanded(false)}
              aria-expanded={expanded}
            >
              Hide buffer
            </button>
          </div>
        </div>

        <div id="context-current-details" className="morp-context__expandable" aria-hidden={!expanded}>
          <div className="morp-context__expandable-inner">
            <p className="morp-context__note">
              The model can only accept a maximum of {SIMULATED_CONTEXT_LIMIT.toLocaleString()} tokens at a time. Once
              this limit is reached further calls to the LLM will fail.
            </p>
            {(sentTokens > 0 || droppedMessageCount > 0) && (
              <p className="morp-context__sent">
                Next call sends ~{sentTokens.toLocaleString()} tokens
                {droppedMessageCount > 0
                  ? ` (${droppedMessageCount} older message${droppedMessageCount === 1 ? '' : 's'} trimmed from model input)`
                  : ''}
              </p>
            )}

            <div className="morp-context__split">
              <section className="morp-context__column" aria-labelledby="context-buffer-heading">
                <header className="morp-context__column-header">
                  <h4 id="context-buffer-heading">Context buffer</h4>
                  <span>{activeContext.length} message{activeContext.length === 1 ? '' : 's'}</span>
                </header>
                <ContextMessageList
                  messages={activeContext}
                  emptyLabel="No messages in the context buffer."
                  includedIds={includedIds}
                  showExcludedState={droppedMessageCount > 0}
                />
              </section>

              <section className="morp-context__column" aria-labelledby="context-memory-heading">
                <header className="morp-context__column-header">
                  <h4 id="context-memory-heading">Memory</h4>
                  <span>{activeMemory.length} message{activeMemory.length === 1 ? '' : 's'}</span>
                </header>
                <p className="morp-context__column-note">
                  Offloaded messages are injected on each model call. Retrieval adds latency.
                </p>
                <ContextMessageList
                  messages={activeMemory}
                  emptyLabel="No messages stored in memory yet."
                />
              </section>
            </div>
          </div>
        </div>
      </div>

      {!expanded && memoryMessageCount > 0 && (
        <p className="morp-context__memory" aria-live="polite">
          MEMORY: {memoryMessageCount} offloaded message{memoryMessageCount === 1 ? '' : 's'} available for retrieval.
        </p>
      )}
      {overflowed && (
        <>
          <p className="morp-context__warning" role="alert">
            CONTEXT OVERFLOW
          </p>
          <p>
            The LLM will reject calls that exceed its context window limits. You must use a context management strategy
            to manage the size of the context window. Each has advantages and disadvantages.
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
