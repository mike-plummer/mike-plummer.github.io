'use client';

interface PromptStackPanelProps {
  systemPrompt: string;
  userPrompt: string;
  exampleUserPrompt?: string;
  promptEvaluation?: string | null;
  onSystemChange: (value: string) => void;
}

export default function PromptStackPanel({
  systemPrompt,
  userPrompt,
  exampleUserPrompt,
  promptEvaluation,
  onSystemChange
}: PromptStackPanelProps) {
  return (
    <section className="morp-panel morp-panel--prompt" aria-labelledby="prompt-heading">
      <header className="morp-panel__header">
        <h3 id="prompt-heading">PROMPT STACK</h3>
      </header>
      <div className="morp-prompt__section">
        <h4>SYSTEM</h4>
        <textarea
          className="morp-prompt__textarea"
          value={systemPrompt}
          onChange={(e) => onSystemChange(e.target.value)}
          rows={6}
          aria-label="System prompt"
        />
      </div>
      {exampleUserPrompt ? (
        <div className="morp-prompt__section morp-prompt__section--example">
          <h4>EXAMPLE (from logs)</h4>
          <pre className="morp-prompt__readonly morp-prompt__example">&gt; {exampleUserPrompt}</pre>
        </div>
      ) : null}
      {promptEvaluation ? (
        <div className="morp-prompt__section morp-prompt__section--evaluation">
          <h4>EVALUATION</h4>
          <pre className="morp-prompt__readonly morp-prompt__evaluation">{promptEvaluation}</pre>
        </div>
      ) : null}
      <div className="morp-prompt__section">
        <h4>USER</h4>
        <pre className="morp-prompt__readonly">&gt; {userPrompt || '[ PLAYER INPUT ]'}</pre>
      </div>
      <p className="morp-panel__note">
        SYSTEM PROMPT: Instructions from the application.
        <br />
        USER PROMPT: Task or information from the user.
        <br />
        Both become input to the model.
      </p>
    </section>
  );
}
