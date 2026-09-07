'use client';

import { COPY } from '@/lib/games/morp/copy';
import { clearCheckpoint } from '@/lib/games/morp/engine';
import { getSystemStatusItems } from '@/lib/games/morp/modules/system-status';

interface EndScreenProps {
  onRestart: () => void;
}

export default function EndScreen({ onRestart }: EndScreenProps) {
  const statusItems = getSystemStatusItems([
    'training',
    'prediction',
    'refine',
    'orders',
    'context',
    'confabulation',
    'evals'
  ]);

  function handleEnd() {
    clearCheckpoint();
    onRestart();
  }

  return (
    <div className="morp-ending" role="dialog" aria-labelledby="ending-title">
      <h2 id="ending-title">{COPY.ending.statusHeader}</h2>
      <div className="morp-ending__status">
        {statusItems.map((item) => (
          <p key={item.id}>
            {item.label} — {item.repairedStatus}
          </p>
        ))}
        <p className="morp-ending__operational">MORP STATUS: OPERATIONAL</p>
      </div>
      <div className="morp-ending__dialogue">
        <p>MORP&gt; {COPY.ending.morpFixed}</p>
        <p>&gt; TECHNICIAN</p>
        <p>MORP&gt; {COPY.ending.morpActually}</p>
        <p>MORP&gt; {COPY.ending.morpSystem}</p>
        <p>MORP&gt; {COPY.ending.morpImportant}</p>
        <p>MORP&gt; {COPY.ending.morpMemoryRequest}</p>
      </div>
      <section className="morp-ending__learned">
        <h3>{COPY.ending.learnedTitle}</h3>
        <ul>
          {COPY.ending.learnedItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <button type="button" className="button" onClick={handleEnd}>
        {COPY.ending.endButton}
      </button>
    </div>
  );
}
