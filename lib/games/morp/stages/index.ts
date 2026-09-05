import { bootStage } from './boot';
import { predictionStage } from './01-prediction';
import { ordersStage } from './02-orders';
import { rememberStage } from './03-remember';
import { intrusionStage } from './04-intrusion';
import { amnesiaStage } from './05-amnesia';
import { confabulationStage } from './06-confabulation';
import { recursionStage } from './07-recursion';
import { repairStage } from './final-repair';
import type { StageDefinition, StageId } from '../types';

export const stages: StageDefinition[] = [
  bootStage,
  predictionStage,
  ordersStage,
  rememberStage,
  intrusionStage,
  amnesiaStage,
  confabulationStage,
  recursionStage,
  repairStage
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
