export type Activity =
  | { kind: 'idle' }
  | { kind: 'chat' }
  | { kind: 'predicting' }
  | { kind: 'summarizing' }
  | { kind: 'revealing' };

export function isActivityBusy(activity: Activity): boolean {
  return activity.kind !== 'idle';
}

export function isPredicting(activity: Activity): boolean {
  return activity.kind === 'predicting';
}

export function isSummarizing(activity: Activity): boolean {
  return activity.kind === 'summarizing';
}

export function isRevealing(activity: Activity): boolean {
  return activity.kind === 'revealing';
}
