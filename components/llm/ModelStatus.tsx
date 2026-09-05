'use client';

import { useEffect } from 'react';
import { useLLM } from './LLMProvider';

interface ModelStatusProps {
  autoLoad?: boolean;
  label?: string;
}

export default function ModelStatus({ autoLoad = true, label = 'Local AI model' }: ModelStatusProps) {
  const { status, progress, error, webGPUSupported, webGPUChecked, loadModel } = useLLM();

  useEffect(() => {
    if (autoLoad && webGPUChecked && webGPUSupported && status === 'idle') {
      void loadModel();
    }
  }, [autoLoad, loadModel, status, webGPUChecked, webGPUSupported]);

  if (!webGPUChecked) {
    return (
      <div className="llm-status">
        <p>
          <strong>{label}</strong> — checking browser support...
        </p>
      </div>
    );
  }

  if (!webGPUSupported) {
    return (
      <div className="llm-status llm-status--error">
        <p>
          <strong>WebGPU required.</strong> This feature runs a local model in your browser. Use Chrome or Edge on
          desktop for the best experience.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="llm-status llm-status--error">
        <p>
          <strong>Model failed to load.</strong> {error}
        </p>
        <button type="button" className="button small" onClick={() => void loadModel()}>
          Retry
        </button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="llm-status llm-status--loading">
        <p>
          <strong>{label}</strong> — downloading and initializing ({progress.percent}%)
        </p>
        <progress max={100} value={progress.percent} />
        <p className="llm-status__detail">{progress.text}</p>
        <p className="llm-status__detail">Runs locally on your GPU. Nothing leaves your browser.</p>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div className="llm-status llm-status--ready">
        <p>
          <strong>{label}</strong> — ready. Inference runs locally on your GPU.
        </p>
      </div>
    );
  }

  return (
    <div className="llm-status">
      <p>
        <strong>{label}</strong> — waiting to load.
      </p>
      {!autoLoad && (
        <button type="button" className="button small" onClick={() => void loadModel()}>
          Load model
        </button>
      )}
    </div>
  );
}
