import { STAGE_ORDER } from '../stage-meta';
import type { StageDefinition, StageId } from '../types';
import { trainingStage } from './00-training';
import { predictionStage } from './01-prediction';
import { ordersStage } from './02-orders';
import { refineStage } from './02-refine';
import { contextStage } from './05-context';
import { confabulationStage } from './06-confabulation';
import { evalsStage } from './07-evals';

const STAGE_REGISTRY: Record<StageId, StageDefinition> = {
  training: trainingStage,
  prediction: predictionStage,
  refine: refineStage,
  orders: ordersStage,
  context: contextStage,
  confabulation: confabulationStage,
  evals: evalsStage
};

export const stages: StageDefinition[] = STAGE_ORDER.map((id) => STAGE_REGISTRY[id]);

export function getStage(id: StageId): StageDefinition | undefined {
  return STAGE_REGISTRY[id];
}

export { getNextStageId } from '../stage-meta';
