'use client';

import {
  getOverallMorpStatus,
  getSystemStatusItems,
  type SystemStatusId,
  type SystemStatusItem
} from '@/lib/games/morp/modules/system-status';
import type { StageId } from '@/lib/games/morp/types';

interface RepairStatusViewProps {
  completedStages: StageId[];
  highlightedItemIds?: SystemStatusId[];
  animate?: boolean;
}

function StatusRow({ item, highlighted, animate }: { item: SystemStatusItem; highlighted: boolean; animate: boolean }) {
  const statusText = item.state === 'repaired' ? item.repairedStatus : item.brokenStatus;
  const className = [
    'morp-status__row',
    item.state === 'repaired' ? 'morp-status__row--repaired' : 'morp-status__row--broken',
    highlighted && animate && 'morp-status__row--highlight'
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={className}>
      <span className="morp-status__label">{item.label}</span>
      <span className="morp-status__value">{statusText}</span>
    </li>
  );
}

export default function RepairStatusView({
  completedStages,
  highlightedItemIds = [],
  animate = false
}: RepairStatusViewProps) {
  const items = getSystemStatusItems(completedStages);
  const overall = getOverallMorpStatus(completedStages);
  const highlightSet = new Set(highlightedItemIds);

  return (
    <div className="morp-status">
      <header className="morp-status__header">
        <h3 className="morp-status__title">REPAIR STATUS</h3>
        <p className="morp-status__subtitle">Application layers around MORP</p>
      </header>
      <ul className="morp-status__list" aria-label="Subsystem status">
        {items.map((item) => (
          <StatusRow key={item.id} item={item} highlighted={highlightSet.has(item.id)} animate={animate} />
        ))}
      </ul>
      <p
        className={`morp-status__overall${overall === 'OPERATIONAL' ? ' morp-status__overall--operational' : ''}`}
        role="status"
      >
        MORP STATUS: {overall}
      </p>
    </div>
  );
}
