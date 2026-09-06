import { bootStage } from './boot';
import { predictionStage } from './01-prediction';
import { refineStage } from './02-refine';
import { ordersStage } from './02-orders';
import { amnesiaStage } from './05-amnesia';
import { confabulationStage } from './06-confabulation';
import { recursionStage } from './07-recursion';
import type { StageDefinition, StageId } from '../types';

export const stages: StageDefinition[] = [
  bootStage,
  predictionStage,
  refineStage,
  ordersStage,
  amnesiaStage,
  confabulationStage,
  recursionStage
];

export function getStage(id: StageId): StageDefinition {
  const stage = stages.find((s) => s.id === id);
  if (!stage) {
    throw new Error(`Unknown stage: ${id}`);
  }
  return stage;
}

export function getNextStageId(current: StageId): StageId | null {
  const index = stages.findIndex((s) => s.id === current);
  if (index < 0 || index >= stages.length - 1) {
    return null;
  }
  return stages[index + 1].id;
}
