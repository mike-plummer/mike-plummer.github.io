'use client';

interface PromptStackPanelProps {
  systemPrompt: string;
  userPrompt: string;
  onSystemChange: (value: string) => void;
}

export default function PromptStackPanel({ systemPrompt, userPrompt, onSystemChange }: PromptStackPanelProps) {
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
