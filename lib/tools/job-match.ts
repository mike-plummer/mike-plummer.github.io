import type { ChatMessage } from '@/lib/llm/types';

export interface JobMatchResult {
  matchPercent: number;
  pros: string[];
  gaps: string[];
  summary: string;
}

export function buildJobMatchMessages(profileContext: string, jobPosting: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You evaluate a candidate against a job posting. Return ONLY valid JSON with this shape: {"matchPercent": number, "pros": string[], "gaps": string[], "summary": string}. Base answers strictly on the provided profile. Do not invent experience.'
    },
    {
      role: 'user',
      content: `Candidate profile:\n${profileContext}\n\nJob posting:\n${jobPosting}`
    }
  ];
}

export function parseJobMatchResult(raw: string): JobMatchResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Model response did not include JSON.');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<JobMatchResult>;
  if (typeof parsed.matchPercent !== 'number' || !Array.isArray(parsed.pros) || !Array.isArray(parsed.gaps)) {
    throw new Error('Model response JSON was missing required fields.');
  }

  return {
    matchPercent: Math.max(0, Math.min(100, Math.round(parsed.matchPercent))),
    pros: parsed.pros.map(String),
    gaps: parsed.gaps.map(String),
    summary: typeof parsed.summary === 'string' ? parsed.summary : ''
  };
}
