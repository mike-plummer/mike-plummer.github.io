'use client';

interface DebugPanelProps {
  enabled: boolean;
  onToggle: () => void;
  debugInput: string;
  debugOutput: string;
  stateJson: string;
}

export default function DebugPanel({ enabled, onToggle, debugInput, debugOutput, stateJson }: DebugPanelProps) {
  return (
    <div className="morp-debug">
      <button type="button" className="button small alt morp-debug__toggle" onClick={onToggle}>
        {enabled ? 'Hide Debug' : 'Show Debug'}
      </button>
      {enabled && (
        <div className="morp-debug__content">
          <details open>
            <summary>Prompt Input</summary>
            <pre>{debugInput || '(empty)'}</pre>
          </details>
          <details open>
            <summary>Model Output</summary>
            <pre>{debugOutput || '(empty)'}</pre>
          </details>
          <details>
            <summary>Game State</summary>
            <pre>{stateJson}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
