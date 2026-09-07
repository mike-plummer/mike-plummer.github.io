'use client';

import { COPY } from '@/lib/games/morp/copy';
import { selectBoot } from '@/lib/games/morp/domain/state';
import type { MorpState } from '@/lib/games/morp/types';
import type { LLMProgress, LLMStatus } from '@/lib/llm/types';

interface BootSequenceProps {
  state: MorpState;
  status: LLMStatus;
  progress: LLMProgress;
  webGPUSupported: boolean;
  onAcknowledge: () => void;
  onInitialize: () => void;
}

export default function BootSequence({
  state,
  status,
  progress,
  webGPUSupported,
  onAcknowledge,
  onInitialize
}: BootSequenceProps) {
  const boot = selectBoot(state);

  if (!webGPUSupported) {
    return (
      <div className="morp-boot morp-boot--error" role="alert">
        <div className="morp-boot__frame">
          <h2>{COPY.boot.webgpuFailed}</h2>
          <p>{COPY.boot.webgpuMessage}</p>
          <div className="morp-boot__actions">
            <a
              href="https://developer.chrome.com/docs/web-platform/webgpu/"
              className="button small"
              target="_blank"
              rel="noopener noreferrer"
            >
              {COPY.boot.webgpuHelp}
            </a>
            <a href="/" className="button small alt">
              {COPY.boot.exit}
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (boot.bootPhase === 'ack') {
    return (
      <div className="morp-boot">
        <div className="morp-boot__frame">
          <h2>{COPY.boot.title}</h2>
          <p className="morp-boot__subtitle">{COPY.boot.subtitle}</p>
          <p>{COPY.boot.acknowledgement}</p>
          <p className="morp-boot__meta">{COPY.boot.modelSize}</p>
          <p className="morp-boot__meta">{COPY.boot.requirements}</p>
          <div className="morp-boot__checkbox">
            <input type="checkbox" id="morp-boot-ack" checked={boot.bootAcknowledged} onChange={onAcknowledge} />
            <label htmlFor="morp-boot-ack">{COPY.boot.checkbox}</label>
          </div>
          <button type="button" className="button" disabled={!boot.bootAcknowledged} onClick={onInitialize}>
            {COPY.boot.initialize}
          </button>
        </div>
      </div>
    );
  }

  if (
    boot.bootPhase === 'loading' ||
    status === 'loading' ||
    status === 'checking' ||
    (boot.bootPhase === 'ready' && status === 'idle')
  ) {
    return (
      <div className="morp-boot">
        <div className="morp-boot__frame">
          <h2>{COPY.boot.initializing}</h2>
          <div
            className="morp-boot__progress"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="morp-boot__progress-bar" style={{ width: `${progress.percent}%` }} />
          </div>
          <p>{progress.percent}%</p>
          <p className="morp-boot__status">{progress.text || 'Preparing model...'}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="morp-boot morp-boot--error" role="alert">
        <div className="morp-boot__frame">
          <h2>INITIALIZATION FAILED</h2>
          <p>Model could not be loaded. Please refresh and try again.</p>
        </div>
      </div>
    );
  }

  return null;
}
