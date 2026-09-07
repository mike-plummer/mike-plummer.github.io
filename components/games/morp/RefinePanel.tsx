'use client';

import { COPY } from '@/lib/games/morp/copy';
import { selectRefine } from '@/lib/games/morp/domain/state';
import { evaluateRefineConfig, formatRefineValue, REFINE_TOPICS } from '@/lib/games/morp/modules/refine-sampling';
import type { MorpState, RefineSamplingConfig } from '@/lib/games/morp/types';

interface RefinePanelProps {
  state: MorpState;
  generating?: boolean;
  streamingText?: string;
  onTopicChange: (topic: string) => void;
  onSamplingChange: (sampling: Partial<RefineSamplingConfig>) => void;
  onResetSampling: () => void;
  onGenerate: () => void;
}

const SAMPLING_FIELDS: Array<{
  key: keyof RefineSamplingConfig;
  min: number;
  max: number;
  step: number;
}> = [
  { key: 'maxTokens', min: 16, max: 512, step: 8 },
  { key: 'topP', min: 0.1, max: 1.0, step: 0.05 },
  { key: 'frequencyPenalty', min: 0, max: 2, step: 0.1 },
  { key: 'presencePenalty', min: 0, max: 2, step: 0.1 },
  { key: 'repetitionPenalty', min: 0.5, max: 1.5, step: 0.05 }
];

export default function RefinePanel({
  state,
  generating = false,
  streamingText = '',
  onTopicChange,
  onSamplingChange,
  onResetSampling,
  onGenerate
}: RefinePanelProps) {
  const refine = selectRefine(state);
  const calibration = evaluateRefineConfig(refine.refineSampling);
  const displaySummary = generating ? streamingText : refine.refineLastSummary;

  return (
    <section className="morp-panel morp-panel--refine" aria-labelledby="refine-heading">
      <header className="morp-panel__header">
        <h3 id="refine-heading">{COPY.refine.title}</h3>
      </header>
      <p className="morp-panel__note">{COPY.refine.instructions}</p>

      <fieldset className="morp-refine__topics">
        <legend>TOPIC</legend>
        {REFINE_TOPICS.map((topic) => (
          <label key={topic} className="morp-refine__topic">
            <input
              type="radio"
              name="refine-topic"
              value={topic}
              checked={refine.refineTopic === topic}
              onChange={() => onTopicChange(topic)}
              disabled={generating}
            />
            <span>{topic}</span>
          </label>
        ))}
      </fieldset>

      <div className="morp-refine__controls">
        <h4>SAMPLING PARAMETERS</h4>
        {SAMPLING_FIELDS.map((field) => (
          <label key={field.key} className="morp-refine__control">
            <span className="morp-refine__control-label">
              {field.key}: {formatRefineValue(field.key, refine.refineSampling[field.key])}
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={refine.refineSampling[field.key]}
              onChange={(event) =>
                onSamplingChange({
                  [field.key]: Number.parseFloat(event.target.value)
                })
              }
              disabled={generating}
            />
            <span className="morp-refine__control-hint">{COPY.refine.params[field.key]}</span>
          </label>
        ))}
        <button
          type="button"
          className="button small alt morp-refine__reset"
          onClick={onResetSampling}
          disabled={generating}
        >
          RESET TO SCRAMBLED
        </button>
      </div>

      <div className="morp-refine__calibration">
        <h4>{COPY.refine.calibrationTitle}</h4>
        {calibration.ok ? (
          <p className="morp-refine__calibration-ok">{COPY.refine.calibrated}</p>
        ) : (
          <ul className="morp-refine__calibration-issues">
            {calibration.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="morp-panel__actions">
        <button type="button" className="button small" onClick={onGenerate} disabled={generating}>
          {generating ? COPY.refine.generating : COPY.refine.generateSummary}
        </button>
      </div>

      <div className="morp-refine__output">
        {(displaySummary.length > 0 || generating) && (
          <div className="morp-refine__summary morp-refine__summary--current">
            <h4>{COPY.refine.currentLabel}</h4>
            <p>{displaySummary || '...'}</p>
          </div>
        )}
      </div>
    </section>
  );
}
