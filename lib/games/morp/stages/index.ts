import type { StageDefinition, StageId } from '../types';
import { trainingStage } from './00-training';
import { predictionStage } from './01-prediction';
import { ordersStage } from './02-orders';
import { refineStage } from './02-refine';
import { contextStage } from './05-context';
import { confabulationStage } from './06-confabulation';
import { evalsStage } from './07-evals';

export const stages: StageDefinition[] = [
  trainingStage,
  predictionStage,
  refineStage,
  ordersStage,
  contextStage,
  confabulationStage,
  evalsStage
];

export function getStage(id: StageId): StageDefinition | undefined {
  return stages.find((s) => s.id === id);
}

export function getNextStageId(current: StageId): StageId | null {
  const index = stages.findIndex((s) => s.id === current);
  if (index < 0 || index >= stages.length - 1) {
    return null;
  }
  return stages[index + 1].id;
}
