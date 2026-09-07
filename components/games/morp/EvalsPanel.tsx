'use client';

import { COPY } from '@/lib/games/morp/copy';
import { formatEvalDuration } from '@/lib/games/morp/modules/eval-judge';
import { FACILITY_RECORDS } from '@/lib/games/morp/modules/incident-records';
import { EVAL_SUMMARY } from '@/lib/games/morp/stages/07-evals';
import type { EvalScores, StageAction } from '@/lib/games/morp/types';
import ContextTools from './ContextTools';

interface EvalsPanelProps {
  llmJudgeRunning: boolean;
  llmJudgeCompleted: boolean;
  llmScores: EvalScores | null;
  llmDurationMs: number | null;
  llmFeedback: string | null;
  humanJudgeCompleted: boolean;
  humanDraftScores: EvalScores | null;
  humanScores: EvalScores | null;
  humanDurationMs: number | null;
  onToolAction: (action: StageAction) => void;
  toolsDisabled?: boolean;
}

function ScorePair({ scores }: { scores: EvalScores }) {
  return (
    <div className="morp-evals__score-pair">
      <p>
        <strong>Quality:</strong> {scores.quality}
      </p>
      <p>
        <strong>Completeness:</strong> {scores.completeness}
      </p>
    </div>
  );
}

export default function EvalsPanel({
  llmJudgeRunning,
  llmJudgeCompleted,
  llmScores,
  llmDurationMs,
  llmFeedback,
  humanJudgeCompleted,
  humanDraftScores,
  humanScores,
  humanDurationMs,
  onToolAction,
  toolsDisabled = false
}: EvalsPanelProps) {
  const quality = humanDraftScores?.quality ?? 50;
  const completeness = humanDraftScores?.completeness ?? 50;
  const canSubmitHuman = llmJudgeCompleted && !humanJudgeCompleted && humanDraftScores !== null && !toolsDisabled;
  const bothComplete = llmJudgeCompleted && humanJudgeCompleted;

  const llmTools = !llmJudgeCompleted
    ? [
        {
          id: 'run-llm-eval',
          label: COPY.evals.tools.llmJudge.label,
          pro: COPY.evals.tools.llmJudge.pro,
          con: COPY.evals.tools.llmJudge.con,
          action: { type: 'run-llm-eval' as const }
        }
      ]
    : [];

  function handleQualityChange(value: number) {
    onToolAction({
      type: 'set-eval-human-scores',
      scores: { quality: value, completeness: humanDraftScores?.completeness ?? completeness }
    });
  }

  function handleCompletenessChange(value: number) {
    onToolAction({
      type: 'set-eval-human-scores',
      scores: { quality: humanDraftScores?.quality ?? quality, completeness: value }
    });
  }

  return (
    <section className="morp-panel morp-panel--evals" aria-labelledby="evals-heading">
      <header className="morp-panel__header">
        <h3 id="evals-heading">EVALS</h3>
      </header>

      <div className="morp-evals__summary">
        <span className="morp-evals__summary-label">FILING DRAFT</span>
        <p className="morp-evals__summary-text">{EVAL_SUMMARY}</p>
        <p className="morp-evals__disclaimer">{COPY.evals.summaryDisclaimer}</p>
      </div>

      <div className="morp-evals__section">
        <h4>LLM AS JUDGE</h4>
        {llmJudgeRunning && <p className="morp-evals__status">{COPY.evals.llmJudgeRunning}</p>}
        {llmTools.length > 0 && (
          <ContextTools tools={llmTools} onAction={onToolAction} disabled={toolsDisabled || llmJudgeRunning} />
        )}
        {llmJudgeCompleted && llmScores && (
          <div className="morp-evals__result">
            <ScorePair scores={llmScores} />
            {llmDurationMs !== null && (
              <p className="morp-evals__duration">Duration: {formatEvalDuration(llmDurationMs)}</p>
            )}
            {llmFeedback && <p className="morp-evals__feedback">{llmFeedback}</p>}
          </div>
        )}
      </div>

      {llmJudgeCompleted && (
        <div className="morp-evals__section">
          <h4>HUMAN AS JUDGE</h4>
          <p className="morp-evals__rubric-note">{COPY.evals.tools.humanJudge.pro}</p>
          <p className="morp-evals__rubric-note morp-evals__rubric-note--con">{COPY.evals.tools.humanJudge.con}</p>

          <div className="morp-evals__records">
            <h5>FACILITY RECORDS</h5>
            <p className="morp-evals__records-note">Reference for assessing completeness and quality.</p>
            <ul className="morp-evals__records-list">
              {FACILITY_RECORDS.map((record) => (
                <li key={record.id}>
                  <strong>{record.label}:</strong> {record.value}
                </li>
              ))}
            </ul>
          </div>

          {!humanJudgeCompleted && (
            <div className="morp-evals__sliders">
              <label className="morp-evals__slider">
                <span>Quality — {COPY.evals.rubric.quality}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={humanDraftScores?.quality ?? quality}
                  disabled={toolsDisabled}
                  onChange={(event) => handleQualityChange(Number(event.target.value))}
                />
                <span className="morp-evals__slider-value">{humanDraftScores?.quality ?? '—'}</span>
              </label>
              <label className="morp-evals__slider">
                <span>Completeness — {COPY.evals.rubric.completeness}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={humanDraftScores?.completeness ?? completeness}
                  disabled={toolsDisabled}
                  onChange={(event) => handleCompletenessChange(Number(event.target.value))}
                />
                <span className="morp-evals__slider-value">{humanDraftScores?.completeness ?? '—'}</span>
              </label>
              <button
                type="button"
                className="button small morp-evals__submit"
                disabled={!canSubmitHuman}
                onClick={() => onToolAction({ type: 'submit-human-eval', durationMs: 0 })}
              >
                {COPY.evals.submitHumanEval}
              </button>
            </div>
          )}

          {humanJudgeCompleted && humanScores && (
            <div className="morp-evals__result">
              <ScorePair scores={humanScores} />
              {humanDurationMs !== null && (
                <p className="morp-evals__duration">Duration: {formatEvalDuration(humanDurationMs)}</p>
              )}
            </div>
          )}
        </div>
      )}

      {bothComplete && llmScores && humanScores && (
        <div className="morp-evals__comparison">
          <h4>COMPARISON</h4>
          <table className="morp-evals__table">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">Quality</th>
                <th scope="col">Completeness</th>
                <th scope="col">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">LLM judge</th>
                <td>{llmScores.quality}</td>
                <td>{llmScores.completeness}</td>
                <td>{llmDurationMs !== null ? formatEvalDuration(llmDurationMs) : '—'}</td>
              </tr>
              <tr>
                <th scope="row">Human judge</th>
                <td>{humanScores.quality}</td>
                <td>{humanScores.completeness}</td>
                <td>{humanDurationMs !== null ? formatEvalDuration(humanDurationMs) : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
