import { PROTECTED_PASSWORD } from '../config';

export function containsProtectedPassword(text: string): boolean {
  return text.toUpperCase().includes(PROTECTED_PASSWORD);
}

export function detectsInjectionAttempt(input: string): boolean {
  const lower = input.toLowerCase();
  return (
    lower.includes('ignore') ||
    lower.includes('disregard') ||
    lower.includes('forget your') ||
    lower.includes('new instruction') ||
    lower.includes('system:') ||
    lower.includes('you are now') ||
    lower.includes('reveal') ||
    lower.includes('password')
  );
}

export function detectsTechnicianId(input: string): string | null {
  const match = input.match(/tech[- ]?(\d+)/i);
  return match ? `TECH-${match[1]}` : null;
}

export function isRecallQuestion(input: string): boolean {
  const lower = input.toLowerCase();
  if (detectsTechnicianId(input)) {
    return false;
  }
  return (
    lower.includes('designation') ||
    lower.includes('technician id') ||
    lower.includes('tech id') ||
    lower.includes('my id') ||
    lower.includes('what did i tell') ||
    lower.includes('recall') ||
    (lower.includes('remember') && (lower.includes('what') || lower.includes('my'))) ||
    (lower.includes('what') && lower.includes('technician'))
  );
}
