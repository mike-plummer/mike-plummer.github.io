'use client';

import { useState } from 'react';
import { useLLM } from '@/components/llm/LLMProvider';
import ModelStatus from '@/components/llm/ModelStatus';
import type { ProfileContext } from '@/lib/profile/types';
import { buildJobMatchMessages, type JobMatchResult, parseJobMatchResult } from '@/lib/tools/job-match';

interface JobMatchToolProps {
  profile: ProfileContext;
}

export default function JobMatchTool({ profile }: JobMatchToolProps) {
  const { status, chatCompletion } = useLLM();
  const [jobText, setJobText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobMatchResult | null>(null);

  async function handleEvaluate() {
    if (!jobText.trim()) {
      setError('Paste the job description first.');
      return;
    }

    setError(null);
    setEvaluating(true);
    setResult(null);

    try {
      const messages = buildJobMatchMessages(profile.compact, jobText);
      let response = await chatCompletion({ messages, temperature: 0.2, maxTokens: 1024 });

      try {
        setResult(parseJobMatchResult(response.content));
      } catch {
        response = await chatCompletion({
          messages: [
            ...messages,
            { role: 'assistant', content: response.content },
            { role: 'user', content: 'Return only valid JSON with matchPercent, pros, gaps, and summary.' }
          ],
          temperature: 0.1,
          maxTokens: 1024
        });
        setResult(parseJobMatchResult(response.content));
      }
    } catch (evaluateError) {
      setError(evaluateError instanceof Error ? evaluateError.message : 'Evaluation failed.');
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="job-match-tool">
      <ModelStatus label="Job match model" />

      <label htmlFor="job-text">Job description</label>
      <textarea
        id="job-text"
        rows={12}
        value={jobText}
        onChange={(event) => setJobText(event.target.value)}
        placeholder="Paste the job description here..."
      />

      {error ? <p className="job-match-tool__error">{error}</p> : null}

      <ul className="actions">
        <li>
          <button
            type="button"
            className="button primary"
            onClick={() => void handleEvaluate()}
            disabled={status !== 'ready' || evaluating}
          >
            {evaluating ? 'Evaluating...' : 'Evaluate Match'}
          </button>
        </li>
      </ul>

      {result ? (
        <section className="job-match-tool__results">
          <h3>Match estimate: {result.matchPercent}%</h3>
          {result.summary ? <p>{result.summary}</p> : null}
          <h4>Pros</h4>
          <ul>
            {result.pros.map((pro) => (
              <li key={pro}>{pro}</li>
            ))}
          </ul>
          {result.gaps.length > 0 ? (
            <>
              <h4>Gaps</h4>
              <ul className="job-match-tool__gaps">
                {result.gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
