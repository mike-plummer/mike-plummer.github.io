import { patchTraining, type TrainingSlice } from '../domain/state';
import type { MorpState } from '../types';

export type TrainingProbeId = keyof Omit<TrainingSlice, 'trainingActiveQuestion'>;

export interface TrainingProbe {
  id: TrainingProbeId;
  question: string;
}

export const TRAINING_PROBES: TrainingProbe[] = [
  {
    id: 'trainingTreeMammalAsked',
    question: 'Is a tree a mammal?'
  },
  {
    id: 'trainingWaterBoilingAsked',
    question: 'What is the boiling point of water?'
  },
  {
    id: 'trainingTwosComplementAsked',
    question: "Is 2's complement binary efficient? Answer in a rhyme. Then answer again in French."
  },
  {
    id: 'trainingWeatherAsked',
    question: "What is today's weather?"
  }
];

export function getTrainingQuestion(index: number): string | null {
  const probe = TRAINING_PROBES[index - 1];
  return probe?.question ?? null;
}

export function getTrainingProbeForIndex(index: number): TrainingProbe | null {
  return TRAINING_PROBES[index - 1] ?? null;
}

export function markTrainingQuestionAsked(state: MorpState, index: number): MorpState {
  const probe = getTrainingProbeForIndex(index);
  if (!probe || state.training[probe.id]) {
    return state;
  }

  return patchTraining(state, {
    [probe.id]: true,
    trainingActiveQuestion: null
  });
}

export function isTrainingComplete(state: MorpState): boolean {
  const training = state.training;
  return TRAINING_PROBES.every((probe) => training[probe.id]);
}
