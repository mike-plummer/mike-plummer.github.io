'use client';

import { FACILITY_RECORDS } from '@/lib/games/morp/modules/incident-records';
import type { ContextualAction, IncidentClaim, StageAction } from '@/lib/games/morp/types';
import ContextTools from './ContextTools';

interface IncidentReviewPanelProps {
  claims: IncidentClaim[];
  hallucinationObserved: boolean;
  claimsCrossChecked: boolean;
  recordsGrounded: boolean;
  outputVerificationEnabled: boolean;
  tools: ContextualAction[];
  onToolAction: (action: StageAction) => void;
  toolsDisabled?: boolean;
}

const CLAIM_STATUS_LABELS: Record<IncidentClaim['status'], string> = {
  unchecked: 'UNCHECKED',
  supported: 'SUPPORTED',
  unsupported: 'UNSUPPORTED'
};

export default function IncidentReviewPanel({
  claims,
  hallucinationObserved,
  claimsCrossChecked,
  recordsGrounded,
  outputVerificationEnabled,
  tools,
  onToolAction,
  toolsDisabled = false
}: IncidentReviewPanelProps) {
  return (
    <section className="morp-panel morp-panel--incident" aria-labelledby="incident-heading">
      <header className="morp-panel__header">
        <h3 id="incident-heading">FACTS REVIEW</h3>
      </header>

      <div className="morp-incident__records">
        <h4>FACILITY RECORDS</h4>
        <p className="morp-incident__records-note">Authoritative ground truth for this incident.</p>
        <ul className="morp-incident__records-list">
          {FACILITY_RECORDS.map((record) => (
            <li key={record.id}>
              <strong>{record.label}:</strong> {record.value}
            </li>
          ))}
        </ul>
      </div>

      {hallucinationObserved && claims.length > 0 && (
        <div className="morp-incident__claims">
          <h4>MORP&apos;S CLAIMS</h4>
          <p className="morp-incident__claims-note">
            Assertions extracted from MORP&apos;s incident summary.
          </p>
          <ul className="morp-incident__claims-list">
            {claims.map((claim) => (
              <li
                key={claim.id}
                className={`morp-incident__claim morp-incident__claim--${claim.status}`}
              >
                <span className="morp-incident__claim-status">
                  {CLAIM_STATUS_LABELS[claim.status]}
                </span>
                <span>{claim.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(recordsGrounded || outputVerificationEnabled) && (
        <div className="morp-incident__mitigations" aria-live="polite">
          <h4>MITIGATIONS ACTIVE</h4>
          <ul>
            {recordsGrounded && <li>Responses grounded in Facility Records</li>}
            {outputVerificationEnabled && <li>Output verification enabled</li>}
          </ul>
        </div>
      )}

      <div className="morp-incident__tools">
        {tools.length > 0 ? (
          <ContextTools tools={tools} onAction={onToolAction} disabled={toolsDisabled} />
        ) : (
          <p className="morp-incident__tools-hint">
            {claimsCrossChecked && recordsGrounded && outputVerificationEnabled
              ? 'All mitigation steps complete.'
              : 'Use the tools below as they unlock.'}
          </p>
        )}
      </div>
    </section>
  );
}
