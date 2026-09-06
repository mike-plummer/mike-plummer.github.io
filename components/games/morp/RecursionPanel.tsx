'use client';

import type { RecursionNode } from '@/lib/games/morp/types';

interface RecursionPanelProps {
  nodes: RecursionNode[];
  recursionLimit: number | null;
  running: boolean;
  failed: boolean;
  computationLevel: number;
  seedSnippet: string;
  onSetLimit: (value: number | null) => void;
  onStart: () => void;
}

export default function RecursionPanel({
  nodes,
  recursionLimit,
  running,
  failed,
  computationLevel,
  seedSnippet,
  onSetLimit,
  onStart
}: RecursionPanelProps) {
  return (
    <section className="morp-panel morp-panel--recursion" aria-labelledby="recursion-heading">
      <header className="morp-panel__header">
        <h3 id="recursion-heading">REVIEW CHAIN</h3>
      </header>
      <div className="morp-recursion__seed">
        <span className="morp-recursion__seed-label">FILING TARGET</span>
        <p>{seedSnippet}</p>
      </div>
      <div className="morp-recursion__limits">
        <span>MAX DEPTH:</span>
        {[1, 3, 5, 10].map((depth) => (
          <button
            key={depth}
            type="button"
            className={`button small${recursionLimit === depth ? '' : ' alt'}`}
            onClick={() => onSetLimit(depth)}
            disabled={running}
          >
            {depth}
          </button>
        ))}
        <button
          type="button"
          className={`button small${recursionLimit === null ? '' : ' alt'}`}
          onClick={() => onSetLimit(null)}
          disabled={running}
        >
          ∞
        </button>
      </div>
      <button type="button" className="button small" onClick={onStart} disabled={running}>
        {running ? 'RUNNING...' : 'START REVIEW CHAIN'}
      </button>
      <div className="morp-recursion__tree">
        {nodes.map((node) => (
          <div key={node.depth} className="morp-recursion__node" style={{ marginLeft: `${(node.depth - 1) * 1.5}rem` }}>
            <strong>{node.label}</strong>
            <p>{node.content}</p>
          </div>
        ))}
      </div>
      <div className="morp-recursion__meters">
        <p>CHAIN DEPTH: {nodes.length}</p>
        <p>COMPUTATION: {computationLevel}% {failed ? '(HIGH — UNSTABLE)' : ''}</p>
      </div>
    </section>
  );
}
