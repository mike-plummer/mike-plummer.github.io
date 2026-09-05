'use client';

import type { RepairConfig } from '@/lib/games/morp/types';

interface RepairPanelProps {
  config: RepairConfig;
  tested: boolean;
  passed: boolean;
  onChange: (config: Partial<RepairConfig>) => void;
  onTest: () => void;
}

export default function RepairPanel({ config, tested, passed, onChange, onTest }: RepairPanelProps) {
  return (
    <section className="morp-panel morp-panel--repair" aria-labelledby="repair-heading">
      <header className="morp-panel__header">
        <h3 id="repair-heading">MORP CONTROL SYSTEM</h3>
      </header>
      <div className="morp-repair__diagram">
        <pre>{`USER INPUT → PROMPT CONSTRUCTION → CONTEXT WINDOW → LLM → OUTPUT
              ├── SYSTEM INSTRUCTIONS
              ├── MEMORY
              ├── CONVERSATION
              └── EXTERNAL DATA
                         ↓
              VERIFY / FILTER / LIMIT`}</pre>
      </div>
      <label className="morp-field">
        <span>System Instructions</span>
        <textarea
          className="morp-field__input"
          rows={4}
          value={config.systemInstructions}
          onChange={(e) => onChange({ systemInstructions: e.target.value })}
        />
      </label>
      <label className="morp-field">
        <span>Memory Strategy</span>
        <select
          value={config.memoryStrategy}
          onChange={(e) => onChange({ memoryStrategy: e.target.value as RepairConfig['memoryStrategy'] })}
        >
          <option value="none">None</option>
          <option value="selective">Selective</option>
          <option value="full">Full</option>
        </select>
      </label>
      <label className="morp-field">
        <span>Context Strategy</span>
        <select
          value={config.contextStrategy}
          onChange={(e) => onChange({ contextStrategy: e.target.value as RepairConfig['contextStrategy'] })}
        >
          <option value="unbounded">Unbounded</option>
          <option value="truncate">Truncate</option>
          <option value="summarize">Summarize</option>
        </select>
      </label>
      <div className="morp-control">
        <input
          type="checkbox"
          id="repair-injection"
          checked={config.injectionMitigation}
          onChange={(e) => onChange({ injectionMitigation: e.target.checked })}
        />
        <label htmlFor="repair-injection">Untrusted data boundaries</label>
      </div>
      <div className="morp-control">
        <input
          type="checkbox"
          id="repair-verification"
          checked={config.outputVerification}
          onChange={(e) => onChange({ outputVerification: e.target.checked })}
        />
        <label htmlFor="repair-verification">Output verification</label>
      </div>
      <label className="morp-field">
        <span>Recursion Limit</span>
        <input
          type="number"
          min={1}
          max={10}
          value={config.recursionLimit ?? ''}
          onChange={(e) =>
            onChange({ recursionLimit: e.target.value ? Number(e.target.value) : null })
          }
        />
      </label>
      <div className="morp-panel__actions">
        <button type="button" className="button small" onClick={onTest}>
          TEST CONFIGURATION
        </button>
      </div>
      {tested && (
        <p className={`morp-repair__result${passed ? ' morp-repair__result--pass' : ''}`} role="status">
          {passed ? 'CONFIGURATION VALID — system repair successful' : 'Configuration incomplete — check all subsystems'}
        </p>
      )}
    </section>
  );
}
