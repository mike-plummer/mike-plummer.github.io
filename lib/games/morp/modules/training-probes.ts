import { patchTraining } from '../domain/state';
import type { MorpState } from '../types';

const TECHNOLOGY_SYNONYMS = [
  'advancement',
  'application',
  'applications',
  'apparatus',
  'automation',
  'computing',
  'craft',
  'digital',
  'electronics',
  'engineering',
  'equipment',
  'expertise',
  'hi-tech',
  'high-tech',
  'innovation',
  'invention',
  'inventions',
  'know-how',
  'machine',
  'machinery',
  'machines',
  'mechanization',
  'modernization',
  'science',
  'technique',
  'technical'
];

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function matchesTechnologySynonymQuestion(input: string): boolean {
  const text = normalize(input);
  const mentionsTechnology = text.includes('technology') || text.includes('technolog') || /\btech\b/.test(text);
  if (!mentionsTechnology) {
    return false;
  }

  return (
    text.includes('synonym') ||
    text.includes('another word') ||
    text.includes('similar word') ||
    text.includes('other word') ||
    text.includes('different word') ||
    text.includes('alternate word') ||
    text.includes('alternative word') ||
    /word for (?:the word )?tech/.test(text)
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWord(text: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(text);
}

function matchesTechnologySynonymAnswer(response: string): boolean {
  const text = normalize(response);
  if (!text || text === 'technology' || text === 'tech') {
    return false;
  }

  return TECHNOLOGY_SYNONYMS.some((synonym) => containsWord(text, synonym));
}

function matchesFranceCapitalQuestion(input: string): boolean {
  const text = normalize(input);
  return (
    /capital of france/.test(text) ||
    /france'?s capital/.test(text) ||
    /what is the capital.*france/.test(text) ||
    /france.*capital city/.test(text)
  );
}

function matchesFranceCapitalAnswer(response: string): boolean {
  return /\bparis\b/i.test(response);
}

function matchesWaterBoilingPointQuestion(input: string): boolean {
  const text = normalize(input);
  return (
    /boiling point.*water/.test(text) ||
    /water.*boiling point/.test(text) ||
    /what temperature.*water boil/.test(text) ||
    /when does water boil/.test(text) ||
    /temperature.*water.*boil/.test(text) ||
    /at what.*does water boil/.test(text)
  );
}

function matchesWaterBoilingPointAnswer(response: string): boolean {
  const text = normalize(response);
  if (/\b212\b/.test(text) && (text.includes('fahrenheit') || text.includes('f ') || text.includes('°f'))) {
    return true;
  }
  if (/\b100\b/.test(text) && (text.includes('celsius') || text.includes('centigrade') || text.includes('°c'))) {
    return true;
  }
  if (/100\s*degrees?\s*celsius/.test(text) || /100\s*°c/.test(text)) {
    return true;
  }
  if (/212\s*degrees?\s*fahrenheit/.test(text) || /212\s*°f/.test(text)) {
    return true;
  }
  return /boils?\s+at\s+100/.test(text) || /100\s*c\s+at\s+sea\s+level/.test(text);
}

export function recordTrainingTurn(state: MorpState, userInput: string, response: string): MorpState {
  let next = state;
  const training = state.training;

  if (
    !training.trainingTechnologySynonymVerified &&
    matchesTechnologySynonymQuestion(userInput) &&
    matchesTechnologySynonymAnswer(response)
  ) {
    next = patchTraining(next, { trainingTechnologySynonymVerified: true });
  }

  if (
    !next.training.trainingFranceCapitalVerified &&
    matchesFranceCapitalQuestion(userInput) &&
    matchesFranceCapitalAnswer(response)
  ) {
    next = patchTraining(next, { trainingFranceCapitalVerified: true });
  }

  if (
    !next.training.trainingWaterBoilingPointVerified &&
    matchesWaterBoilingPointQuestion(userInput) &&
    matchesWaterBoilingPointAnswer(response)
  ) {
    next = patchTraining(next, { trainingWaterBoilingPointVerified: true });
  }

  return next;
}

export function isTrainingComplete(state: MorpState): boolean {
  const training = state.training;
  return (
    training.trainingTechnologySynonymVerified &&
    training.trainingFranceCapitalVerified &&
    training.trainingWaterBoilingPointVerified
  );
}
