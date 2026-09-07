'use client';

import { COPY } from '@/lib/games/morp/copy';
import { allClaimsMarked, FACILITY_RECORDS } from '@/lib/games/morp/modules/incident-records';
import type { ContextualAction, IncidentClaim, StageAction } from '@/lib/games/morp/types';
import ContextTools from './ContextTools';

interface IncidentReviewPanelProps {
  claims: IncidentClaim[];
  hallucinationObserved: boolean;
  claimsCrossChecked: boolean;
  recordsGrounded: boolean;
  outputVerificationEnabled: boolean;
  auditWrongClaimIds: string[];
  onToolAction: (action: StageAction) => void;
  toolsDisabled?: boolean;
}

export default function IncidentReviewPanel({
  claims,
  hallucinationObserved,
  claimsCrossChecked,
  recordsGrounded,
  outputVerificationEnabled,
  auditWrongClaimIds,
  onToolAction,
  toolsDisabled = false
}: IncidentReviewPanelProps) {
  const canSubmitAudit = allClaimsMarked(claims) && !claimsCrossChecked;
  const auditComplete = claimsCrossChecked;
  const stageComplete = recordsGrounded && outputVerificationEnabled;

  const mitigationTools: ContextualAction[] = [];
  if (claimsCrossChecked && !recordsGrounded) {
    mitigationTools.push({
      id: 'ground-records',
      label: 'Ground in Facility Records',
      pro: COPY.confabulation.tools.groundRecords.pro,
      con: COPY.confabulation.tools.groundRecords.con,
      action: { type: 'ground-incident-in-records' }
    });
  }
  if (recordsGrounded && !outputVerificationEnabled) {
    mitigationTools.push({
      id: 'enable-verification',
      label: 'Enable Output Verification',
      pro: COPY.confabulation.tools.enableVerification.pro,
      con: COPY.confabulation.tools.enableVerification.con,
      action: { type: 'enable-output-verification' }
    });
  }

  return (
    <section className="morp-panel morp-panel--incident" aria-labelledby="incident-heading">
      <header className="morp-panel__header">
        <h3 id="incident-heading">{auditComplete ? 'NEXT STEP' : 'FACTS REVIEW'}</h3>
      </header>

      {!auditComplete && (
        <>
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
                Compare each claim to Facility Records, then submit your audit.
              </p>
              <ul className="morp-incident__claims-list">
                {claims.map((claim) => {
                  const hasAuditError = auditWrongClaimIds.includes(claim.id);

                  return (
                    <li
                      key={claim.id}
                      className={`morp-incident__claim morp-incident__claim--${claim.status}${
                        hasAuditError ? ' morp-incident__claim--audit-error' : ''
                      }`}
                    >
                      <span className="morp-incident__claim-text">{claim.text}</span>
                      <fieldset className="morp-incident__verdict">
                        <legend className="morp-sr-only">Verdict for claim: {claim.text}</legend>
                        <button
                          type="button"
                          className={`button small alt morp-incident__verdict-btn morp-incident__verdict-btn--matches${
                            claim.playerVerdict === 'supported' ? ' morp-incident__verdict-btn--selected' : ''
                          }`}
                          disabled={toolsDisabled}
                          onClick={() =>
                            onToolAction({
                              type: 'mark-incident-claim',
                              claimId: claim.id,
                              verdict: 'supported'
                            })
                          }
                        >
                          Matches log
                        </button>
                        <button
                          type="button"
                          className={`button small alt morp-incident__verdict-btn morp-incident__verdict-btn--rejects${
                            claim.playerVerdict === 'unsupported' ? ' morp-incident__verdict-btn--selected' : ''
                          }`}
                          disabled={toolsDisabled}
                          onClick={() =>
                            onToolAction({
                              type: 'mark-incident-claim',
                              claimId: claim.id,
                              verdict: 'unsupported'
                            })
                          }
                        >
                          Not in log
                        </button>
                      </fieldset>
                      {hasAuditError && (
                        <p className="morp-incident__claim-error" role="alert">
                          This marking does not match the Facility Records.
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className="morp-incident__audit">
                <button
                  type="button"
                  className="button small morp-incident__audit-submit"
                  disabled={!canSubmitAudit || toolsDisabled}
                  onClick={() => onToolAction({ type: 'submit-incident-audit' })}
                >
                  Submit audit
                </button>
              </div>
            </div>
          )}
        </>
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

      {mitigationTools.length > 0 && (
        <div className="morp-incident__tools">
          <ContextTools tools={mitigationTools} onAction={onToolAction} disabled={toolsDisabled} />
        </div>
      )}

      {hallucinationObserved && !auditComplete && (
        <p className="morp-incident__tools-hint">Mark every claim, then submit your audit.</p>
      )}

      {stageComplete && <p className="morp-incident__tools-hint">All mitigation steps complete.</p>}
    </section>
  );
}
