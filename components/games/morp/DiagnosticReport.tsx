'use client';

import { getNextStageMeta } from '@/lib/games/morp/stage-meta';
import type { DiagnosticReport, StageId } from '@/lib/games/morp/types';

interface DiagnosticReportModalProps {
  report: DiagnosticReport;
  currentStage: StageId;
  onContinue: () => void;
}

export default function DiagnosticReportModal({
  report,
  currentStage,
  onContinue
}: DiagnosticReportModalProps) {
  const nextMeta = getNextStageMeta(currentStage);
  const continueLabel = nextMeta ? `Advance to ${nextMeta.label}` : 'Complete Diagnostic';

  return (
    <div className="morp-report-overlay" role="dialog" aria-labelledby="report-title" aria-modal="true">
      <div className="morp-report">
        <p className="morp-report__stage-complete">STAGE COMPLETE</p>
        <h2 id="report-title">{report.title}</h2>
        <section>
          <h3>WHAT HAPPENED?</h3>
          <p>{report.whatHappened}</p>
        </section>
        <section>
          <h3>KEY IDEA</h3>
          <p>{report.keyIdea}</p>
        </section>
        {nextMeta && (
          <p className="morp-report__next">
            Advancing to: <strong>Stage {nextMeta.shortLabel} — {nextMeta.label}</strong>
          </p>
        )}
        <button type="button" className="button" onClick={onContinue}>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
