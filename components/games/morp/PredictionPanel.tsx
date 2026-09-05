'use client';

import { COPY } from '@/lib/games/morp/copy';
import type { MorpState } from '@/lib/games/morp/types';

interface PredictionPanelProps {
  state: MorpState;
  onInputChange: (value: string) => void;
  onGenerateToken: () => void;
  onGenerateTokens: (count: number) => void;
  onTemperatureChange: (value: number) => void;
}

export default function PredictionPanel({
  state,
  onInputChange,
  onGenerateToken,
  onGenerateTokens,
  onTemperatureChange
}: PredictionPanelProps) {
  return (
    <section className="morp-panel morp-panel--prediction" aria-labelledby="prediction-heading">
      <header className="morp-panel__header">
        <h3 id="prediction-heading">{COPY.prediction.title}</h3>
      </header>
      <p className="morp-panel__note">{COPY.prediction.visualizationNote}</p>
      <label className="morp-field">
        <span>INPUT</span>
        <input
          type="text"
          value={state.predictionInput}
          onChange={(e) => onInputChange(e.target.value)}
          className="morp-field__input"
        />
      </label>
      <div className="morp-prediction__candidates">
        <h4>LIKELY NEXT TOKENS</h4>
        {state.predictionCandidates.map((candidate) => (
          <div key={candidate.token} className="morp-prediction__row">
            <span className="morp-prediction__token">{candidate.token}</span>
            <div className="morp-prediction__bar-track">
              <div
                className="morp-prediction__bar"
                style={{ width: `${candidate.weight * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {state.predictionSelected && (
        <p className="morp-prediction__selected">SELECTED: &gt; {state.predictionSelected}</p>
      )}
      {state.predictionGenerated && (
        <p className="morp-prediction__generated">GENERATED: {state.predictionGenerated}</p>
      )}
      <p className="morp-prediction__experiments">
        Experiments: {state.predictionExperiments} / 2 minimum
      </p>
      <div className="morp-panel__actions">
        <button type="button" className="button small" onClick={onGenerateToken}>
          GENERATE NEXT TOKEN
        </button>
        <button type="button" className="button small" onClick={() => onGenerateTokens(10)}>
          GENERATE 10 TOKENS
        </button>
        <button type="button" className="button small alt" onClick={() => onTemperatureChange(0.3)}>
          TEMP: LOW
        </button>
        <button type="button" className="button small alt" onClick={() => onTemperatureChange(1.0)}>
          TEMP: HIGH ({state.predictionTemperature.toFixed(1)})
        </button>
      </div>
    </section>
  );
}
