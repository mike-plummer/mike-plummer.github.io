'use client';

import { COPY } from '@/lib/games/morp/copy';
import { selectPrediction } from '@/lib/games/morp/domain/state';
import type { MorpState } from '@/lib/games/morp/types';

interface PredictionPanelProps {
  state: MorpState;
  predicting?: boolean;
  candidatesFailed?: boolean;
  onInputChange: (value: string) => void;
  onPredict: () => void;
  onAcceptToken: (token: string, percent: number | null, rawToken?: string) => void;
  onTemperatureChange: (value: number) => void;
}

export default function PredictionPanel({
  state,
  predicting = false,
  candidatesFailed = false,
  onInputChange,
  onPredict,
  onAcceptToken,
  onTemperatureChange
}: PredictionPanelProps) {
  const prediction = selectPrediction(state);
  const canPredict = prediction.predictionInput.trim().length > 0 && !predicting;
  const hasCandidates = prediction.predictionCandidates.length > 0;

  return (
    <section className="morp-panel morp-panel--prediction" aria-labelledby="prediction-heading">
      <header className="morp-panel__header">
        <h3 id="prediction-heading">{COPY.prediction.title}</h3>
      </header>
      <p className="morp-panel__note">{COPY.prediction.visualizationNote}</p>
      <p className="morp-prediction__instructions">{COPY.prediction.instructions}</p>

      <label className="morp-field">
        <span>INPUT</span>
        <textarea
          value={prediction.predictionInput}
          onChange={(e) => onInputChange(e.target.value)}
          className="morp-field__input"
          disabled={predicting}
        />
      </label>

      {prediction.predictionSelected && (
        <p className="morp-prediction__selected">
          {COPY.prediction.lastAccepted}: <strong>{prediction.predictionSelected}</strong>
          {prediction.predictionLastSampledPercent !== null && (
            <span className="morp-prediction__sampled-weight">
              {' '}
              ({prediction.predictionLastSampledPercent}% at this temperature)
            </span>
          )}
        </p>
      )}

      <label className="morp-prediction__temperature">
        <span className="morp-prediction__temperature-label">
          TEMPERATURE: {prediction.predictionTemperature.toFixed(1)}
        </span>
        <input
          type="range"
          min={0.0}
          max={2}
          step={0.1}
          value={prediction.predictionTemperature}
          onChange={(e) => onTemperatureChange(Number.parseFloat(e.target.value))}
          className="morp-prediction__temperature-slider"
          disabled={predicting}
        />
        <span className="morp-prediction__temperature-hint">{COPY.prediction.temperatureHint}</span>
      </label>

      <div className="morp-panel__actions">
        <button type="button" className="button small" onClick={onPredict} disabled={!canPredict}>
          {predicting ? 'PREDICTING...' : COPY.prediction.predictNextToken}
        </button>
      </div>

      <div className="morp-prediction__candidates">
        <h4>LIKELY NEXT TOKENS</h4>
        {predicting && <p className="morp-prediction__loading">Estimating next tokens from model...</p>}
        {candidatesFailed && !predicting && (
          <p className="morp-prediction__error">{COPY.prediction.candidatesFailed}</p>
        )}
        {!predicting && !candidatesFailed && !hasCandidates && (
          <p className="morp-prediction__empty">No predictions yet — click Predict Next Token when ready.</p>
        )}
        {!predicting &&
          hasCandidates &&
          prediction.predictionCandidates.map((candidate) => {
            const isSelected = candidate.token === prediction.predictionSelected;
            const rowKey = candidate.rawToken ?? candidate.token;
            return (
              <div
                key={rowKey}
                className={`morp-prediction__row${isSelected ? ' morp-prediction__row--selected' : ''}${candidate.startsNewWord ? ' morp-prediction__row--new-word' : ''}`}
              >
                <span className="morp-prediction__token">{candidate.token}</span>
                <div className="morp-prediction__bar-track">
                  <div
                    className={`morp-prediction__bar${isSelected ? ' morp-prediction__bar--selected' : ''}`}
                    style={{ width: `${candidate.weight * 100}%` }}
                  />
                </div>
                <span className="morp-prediction__weight">{(candidate.weight * 100).toFixed(2)}%</span>
                <button
                  type="button"
                  className="button small morp-prediction__accept"
                  onClick={() => onAcceptToken(candidate.token, Math.round(candidate.weight * 100), candidate.rawToken)}
                  disabled={predicting}
                >
                  {COPY.prediction.acceptToken}
                </button>
              </div>
            );
          })}
      </div>
    </section>
  );
}
