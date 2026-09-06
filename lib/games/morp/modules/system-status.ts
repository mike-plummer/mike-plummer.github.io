import type { StageId } from '../types';

export type SystemStatusId =
  | 'training'
  | 'prediction'
  | 'sampling'
  | 'prompts'
  | 'injection'
  | 'memory'
  | 'context'
  | 'verification'
  | 'evals';

export type SystemStatusState = 'broken' | 'repaired';

export interface SystemStatusDefinition {
  id: SystemStatusId;
  label: string;
  brokenStatus: string;
  repairedStatus: string;
  repairedByStage: StageId;
}

export interface SystemStatusItem extends SystemStatusDefinition {
  state: SystemStatusState;
}

export type OverallMorpStatus = 'DEGRADED' | 'OPERATIONAL';

export const SYSTEM_STATUS_DEFINITIONS: SystemStatusDefinition[] = [
  {
    id: 'training',
    label: 'TRAINING',
    brokenStatus: 'UNVERIFIED',
    repairedStatus: 'VERIFIED',
    repairedByStage: 'training'
  },
  {
    id: 'prediction',
    label: 'PREDICTION',
    brokenStatus: 'OFFLINE',
    repairedStatus: 'ONLINE',
    repairedByStage: 'prediction'
  },
  {
    id: 'sampling',
    label: 'SAMPLING',
    brokenStatus: 'MISCALIBRATED',
    repairedStatus: 'STABLE',
    repairedByStage: 'refine'
  },
  {
    id: 'prompts',
    label: 'PROMPTS',
    brokenStatus: 'VULNERABLE',
    repairedStatus: 'SECURED',
    repairedByStage: 'orders'
  },
  {
    id: 'injection',
    label: 'INJECTION',
    brokenStatus: 'EXPOSED',
    repairedStatus: 'MITIGATED',
    repairedByStage: 'orders'
  },
  {
    id: 'memory',
    label: 'MEMORY',
    brokenStatus: 'UNMANAGED',
    repairedStatus: 'STABLE',
    repairedByStage: 'context'
  },
  {
    id: 'context',
    label: 'CONTEXT',
    brokenStatus: 'OVERFLOWING',
    repairedStatus: 'STABLE',
    repairedByStage: 'context'
  },
  {
    id: 'verification',
    label: 'VERIFICATION',
    brokenStatus: 'DISABLED',
    repairedStatus: 'ENABLED',
    repairedByStage: 'confabulation'
  },
  {
    id: 'evals',
    label: 'EVALS',
    brokenStatus: 'UNSCORED',
    repairedStatus: 'CALIBRATED',
    repairedByStage: 'evals'
  }
];

function isRepaired(definition: SystemStatusDefinition, completedStages: StageId[]): boolean {
  return completedStages.includes(definition.repairedByStage);
}

export function getSystemStatusItems(completedStages: StageId[]): SystemStatusItem[] {
  return SYSTEM_STATUS_DEFINITIONS.map((definition) => ({
    ...definition,
    state: isRepaired(definition, completedStages) ? 'repaired' : 'broken'
  }));
}

export function getStatusItemsRepairedByStage(stageId: StageId): SystemStatusDefinition[] {
  return SYSTEM_STATUS_DEFINITIONS.filter((definition) => definition.repairedByStage === stageId);
}

export function getStatusItemIdsRepairedByStage(stageId: StageId): SystemStatusId[] {
  return getStatusItemsRepairedByStage(stageId).map((item) => item.id);
}

export function isSystemFullyRepaired(completedStages: StageId[]): boolean {
  return SYSTEM_STATUS_DEFINITIONS.every((definition) => isRepaired(definition, completedStages));
}

export function getOverallMorpStatus(completedStages: StageId[]): OverallMorpStatus {
  return isSystemFullyRepaired(completedStages) ? 'OPERATIONAL' : 'DEGRADED';
}

export function formatStatusLine(item: SystemStatusItem): string {
  const status = item.state === 'repaired' ? item.repairedStatus : item.brokenStatus;
  return `${item.label} — ${status}`;
}
