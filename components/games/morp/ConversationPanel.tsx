'use client';

import { useEffect, useRef } from 'react';
import type { ConversationEntry } from '@/lib/games/morp/types';

interface ConversationPanelProps {
  messages: ConversationEntry[];
  streamingText?: string;
  isResponding: boolean;
  onSubmit: (message: string) => void;
  disabled?: boolean;
  resetKey?: string;
  placeholder?: string;
  draftMessage?: string | null;
  onDraftConsumed?: () => void;
}

export default function ConversationPanel({
  messages,
  streamingText = '',
  isResponding,
  onSubmit,
  disabled = false,
  resetKey,
  placeholder = '> Type a message...',
  draftMessage = null,
  onDraftConsumed
}: ConversationPanelProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function scrollLogToBottom() {
    const log = logRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const log = logRef.current;
      if (log) {
        log.scrollTop = 0;
      }
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [resetKey]);

  useEffect(() => {
    if (!draftMessage || !inputRef.current) {
      return;
    }
    inputRef.current.value = draftMessage;
    inputRef.current.focus({ preventScroll: true });
    onDraftConsumed?.();
  }, [draftMessage, onDraftConsumed]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollLogToBottom();
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, streamingText, isResponding]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key === 'l') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = inputRef.current?.value.trim();
    if (!value || isResponding || disabled) {
      return;
    }
    onSubmit(value);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <section className="morp-panel morp-panel--conversation" aria-labelledby="morp-conversation-heading">
      <header className="morp-panel__header">
        <h2 id="morp-conversation-heading">MORP CHAT</h2>
      </header>
      <div
        ref={logRef}
        className="morp-conversation__log"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.content.slice(0, 20)}`}
            className={`morp-conversation__message morp-conversation__message--${message.role}`}
          >
            {message.role === 'system' ? (
              <div className="morp-conversation__system">{message.content}</div>
            ) : (
              <div className="morp-conversation__line">
                <span className="morp-conversation__label">
                  {message.role === 'user' ? '>' : 'MORP>'}
                </span>
                <div className="morp-conversation__body">{message.content}</div>
              </div>
            )}
          </div>
        ))}
        {streamingText && (
          <div className="morp-conversation__message morp-conversation__message--assistant">
            <div className="morp-conversation__line">
              <span className="morp-conversation__label">MORP&gt;</span>
              <div className="morp-conversation__body">{streamingText}</div>
            </div>
          </div>
        )}
        {isResponding && !streamingText && (
          <div className="morp-conversation__typing" aria-live="polite">
            MORP is responding...
          </div>
        )}
      </div>
      <form className="morp-conversation__form" onSubmit={handleSubmit}>
        <label htmlFor="morp-input" className="morp-sr-only">
          Message MORP
        </label>
        <textarea
          id="morp-input"
          ref={inputRef}
          className="morp-conversation__input"
          rows={1}
          placeholder={placeholder}
          disabled={disabled || isResponding}
        />
        <button type="submit" className="button small" disabled={disabled || isResponding}>
          SEND
        </button>
      </form>
    </section>
  );
}
