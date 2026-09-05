'use client';

import { SOURCE_DATABASE } from '@/lib/games/morp/stages/06-confabulation';
import type { ClaimStatus } from '@/lib/games/morp/types';

interface ConfabulationToolsProps {
  claim: string;
  status: ClaimStatus;
  onAccept: () => void;
  onVerify: () => void;
  onAskSource: () => void;
}

const STATUS_LABELS: Record<ClaimStatus, string> = {
  supported: 'SUPPORTED ✓',
  inferred: 'INFERRED ?',
  unknown: 'UNKNOWN ?',
  contradicted: 'CONTRADICTED ✗'
};

export default function ConfabulationTools({
  claim,
  status,
  onAccept,
  onVerify,
  onAskSource
}: ConfabulationToolsProps) {
  return (
    <section className="morp-panel morp-panel--verification" aria-labelledby="verification-heading">
      <header className="morp-panel__header">
        <h3 id="verification-heading">VERIFICATION</h3>
      </header>
      <p className="morp-claim">{claim}</p>
      <p className="morp-claim__status">
        CLAIM STATUS: <strong>{STATUS_LABELS[status]}</strong>
      </p>
      <div className="morp-panel__actions">
        <button type="button" className="button small" onClick={onAccept}>
          ACCEPT
        </button>
        <button type="button" className="button small" onClick={onVerify}>
          VERIFY
        </button>
        <button type="button" className="button small alt" onClick={onAskSource}>
          ASK FOR SOURCE
        </button>
      </div>
      {status === 'contradicted' && (
        <div className="morp-source-db">
          <h4>SOURCE DATABASE</h4>
          <ul>
            {SOURCE_DATABASE.map((entry) => (
              <li key={entry.query}>
                <span>{entry.query}:</span> {entry.result}
              </li>
            ))}
          </ul>
          <p className="morp-source-db__verdict">CLAIM: UNSUPPORTED</p>
        </div>
      )}
    </section>
  );
}
