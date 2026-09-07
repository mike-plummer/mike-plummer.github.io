'use client';

import { forwardRef, useEffect, useRef } from 'react';
import type { ConversationEntry } from '@/lib/games/morp/types';

interface ConversationPanelProps {
  messages: ConversationEntry[];
  streamingText?: string;
  isResponding: boolean;
  onSubmit: (message: string) => void;
  disabled?: boolean;
  hideInput?: boolean;
  highlighted?: boolean;
  resetKey?: string;
  placeholder?: string;
  lockedInputValue?: string | null;
}

const ConversationPanel = forwardRef<HTMLElement, ConversationPanelProps>(function ConversationPanel(
  {
    messages,
    streamingText = '',
    isResponding,
    onSubmit,
    disabled = false,
    hideInput = false,
    highlighted = false,
    resetKey,
    placeholder = '> Type a message...',
    lockedInputValue = null
  },
  ref
) {
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isInputLocked = lockedInputValue !== null;

  function scrollLogToBottom() {
    const log = logRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }

  useEffect(() => {
    if (hideInput) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const log = logRef.current;
      if (log) {
        log.scrollTop = 0;
      }
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [resetKey, hideInput]);

  useEffect(() => {
    if (hideInput || !inputRef.current) {
      return;
    }

    if (isInputLocked) {
      inputRef.current.value = lockedInputValue ?? '';
      return;
    }

    inputRef.current.value = '';
  }, [hideInput, isInputLocked, lockedInputValue]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollLogToBottom();
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, streamingText, isResponding]);

  useEffect(() => {
    if (hideInput) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key === 'l') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hideInput]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = (isInputLocked ? lockedInputValue : inputRef.current?.value)?.trim();
    if (!value || isResponding || disabled) {
      return;
    }
    onSubmit(value);
    if (!isInputLocked && inputRef.current) {
      inputRef.current.value = '';
    }
  }

  const showThinking = isResponding && !streamingText;

  return (
    <section
      ref={ref}
      className={`morp-panel morp-panel--conversation${highlighted ? ' morp-panel--chat-reveal' : ''}`}
      aria-labelledby="morp-conversation-heading"
    >
      <header className="morp-panel__header">
        <h2 id="morp-conversation-heading">MORP CHAT</h2>
      </header>
      <div ref={logRef} className="morp-conversation__log" role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.content.slice(0, 20)}`}
            className={`morp-conversation__message morp-conversation__message--${message.role}`}
          >
            {message.role === 'system' ? (
              <div className="morp-conversation__system">{message.content}</div>
            ) : (
              <div className="morp-conversation__line">
                <span className="morp-conversation__label">{message.role === 'user' ? '>' : 'MORP>'}</span>
                <div className="morp-conversation__body">{message.content}</div>
              </div>
            )}
          </div>
        ))}
        {streamingText && (
          <div className="morp-conversation__message morp-conversation__message--assistant morp-conversation__message--streaming">
            <div className="morp-conversation__line">
              <span className="morp-conversation__label">MORP&gt;</span>
              <div className="morp-conversation__body">
                {streamingText}
                <span className="morp-conversation__cursor" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}
        {showThinking && (
          <div className="morp-conversation__message morp-conversation__message--assistant morp-conversation__message--thinking">
            <div className="morp-conversation__line">
              <span className="morp-conversation__label">MORP&gt;</span>
              <div className="morp-conversation__body morp-conversation__thinking">
                <span className="morp-conversation__cursor" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}
      </div>
      {!hideInput && (
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
            readOnly={isInputLocked}
            disabled={disabled || isResponding}
          />
          <button type="submit" className="button small" disabled={disabled || isResponding}>
            SEND
          </button>
        </form>
      )}
    </section>
  );
});

export default ConversationPanel;
