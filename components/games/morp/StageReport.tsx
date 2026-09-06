'use client';

import { COPY } from '@/lib/games/morp/copy';
import { getNextStageMeta, getStageMeta } from '@/lib/games/morp/stage-meta';
import type { DiagnosticReport, StageId } from '@/lib/games/morp/types';

interface StageReportProps {
  report: DiagnosticReport | null;
  currentStage: StageId;
  objectivesMet: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onContinue: () => void;
  onOpenBriefing: () => void;
}

export default function StageReport({
  report,
  currentStage,
  objectivesMet,
  expanded,
  onToggleExpanded,
  onContinue,
  onOpenBriefing
}: StageReportProps) {
  const meta = getStageMeta(currentStage);
  const nextMeta = getNextStageMeta(currentStage);
  const continueLabel = nextMeta ? `Advance to ${nextMeta.label}` : 'Complete Diagnostic';

  if (!objectivesMet) {
    return (
      <section className="morp-stage-report morp-stage-report--pending" aria-label="Stage progress">
        <p className="morp-stage-report__objectives-hint">
          {COPY.stageReport.objectivesIncomplete}{' '}
          <button type="button" className="morp-stage-report__briefing-link" onClick={onOpenBriefing}>
            {COPY.stageReport.showBriefing}
          </button>
        </p>
        <div className="morp-stage-report__actions">
          <button type="button" className="button morp-stage-report__continue" disabled>
            {continueLabel}
          </button>
        </div>
      </section>
    );
  }

  if (!report) {
    return null;
  }

  if (!expanded) {
    return (
      <section className="morp-stage-report morp-stage-report--collapsed" aria-label="Stage diagnostic summary">
        <button
          type="button"
          className="morp-stage-report__toggle"
          onClick={onToggleExpanded}
          aria-expanded={false}
        >
          <span className="morp-stage-report__toggle-label">Stage complete: {meta.label}</span>
          <span className="morp-stage-report__toggle-hint">Show diagnostic summary</span>
        </button>
      </section>
    );
  }

  return (
    <section className="morp-stage-report morp-stage-report--expanded" aria-labelledby="stage-report-title">
      <div className="morp-stage-report__header">
        <div>
          <p className="morp-stage-report__eyebrow">Stage complete</p>
          <h2 id="stage-report-title">{report.title}</h2>
        </div>
        <button
          type="button"
          className="button small alt morp-stage-report__collapse"
          onClick={onToggleExpanded}
          aria-expanded
        >
          Hide summary
        </button>
      </div>

      <p className="morp-stage-report__hint">{meta.completionHint}</p>

      <section className="morp-stage-report__section">
        <h3>What happened?</h3>
        <p>{report.whatHappened}</p>
      </section>

      <section className="morp-stage-report__section">
        <h3>Key idea</h3>
        <p>{report.keyIdea}</p>
      </section>

      {nextMeta && (
        <p className="morp-stage-report__next">
          Next stage: <strong>{nextMeta.label}</strong>
        </p>
      )}

      <div className="morp-stage-report__actions">
        <button type="button" className="button morp-stage-report__continue" onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </section>
  );
}
