'use client';

import { useEffect, useRef, useState } from 'react';
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
  const reportRef = useRef<HTMLElement>(null);
  const prevObjectivesMetRef = useRef(objectivesMet);
  const [justCompleted, setJustCompleted] = useState(false);
  const meta = getStageMeta(currentStage);
  const nextMeta = getNextStageMeta(currentStage);
  const continueLabel = nextMeta ? `Advance to ${nextMeta.label}` : 'Complete Diagnostic';

  useEffect(() => {
    prevObjectivesMetRef.current = objectivesMet;
  }, [currentStage]);

  useEffect(() => {
    if (objectivesMet && !prevObjectivesMetRef.current) {
      setJustCompleted(true);
      const frame = requestAnimationFrame(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      const timeout = window.setTimeout(() => setJustCompleted(false), 1400);

      return () => {
        cancelAnimationFrame(frame);
        window.clearTimeout(timeout);
      };
    }

    prevObjectivesMetRef.current = objectivesMet;
  }, [objectivesMet]);

  if (objectivesMet && !report) {
    return null;
  }

  if (objectivesMet && report) {
    return (
      <section
        ref={reportRef}
        className={[
          'morp-stage-report',
          'morp-stage-report--complete',
          expanded ? 'morp-stage-report--expanded' : 'morp-stage-report--collapsed',
          justCompleted && 'morp-stage-report--revealed'
        ]
          .filter(Boolean)
          .join(' ')}
        aria-labelledby={expanded ? 'stage-report-title' : undefined}
        aria-label={expanded ? undefined : 'Stage diagnostic summary'}
      >
        <button
          type="button"
          className="morp-stage-report__toggle"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
        >
          <span className="morp-stage-report__toggle-label">Stage complete: {meta.label}</span>
          <span className="morp-stage-report__toggle-hint">Show diagnostic summary</span>
        </button>

        <div className="morp-stage-report__expandable" aria-hidden={!expanded}>
          <div className="morp-stage-report__expandable-inner">
            <div className="morp-stage-report__header">
              <div>
                <p className="morp-stage-report__eyebrow">Stage complete</p>
                <h2 id="stage-report-title">{report.title}</h2>
              </div>
              <button
                type="button"
                className="button small alt morp-stage-report__collapse"
                onClick={onToggleExpanded}
                aria-expanded={expanded}
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
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={reportRef}
      className={[
        'morp-stage-report',
        'morp-stage-report--pending',
        justCompleted && 'morp-stage-report--revealed'
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Stage progress"
    >
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
