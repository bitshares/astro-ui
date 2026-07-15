import React from "react";

/**
 * Renders the wordy, step-by-step maths behind a non-geometric algorithm's
 * hit, straight from `explainHit(...)`.
 *
 * @param {object} props
 * @param {object} props.explanation  `{ steps: Array<{label, math, value}>, note }`.
 * @param {number} props.ticket       The specific ticket being explained.
 */
export default function AlgoMathExplanation({ explanation, ticket }) {
  if (!explanation) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        No arithmetic breakdown is available for this algorithm.
      </div>
    );
  }
  const { steps = [], note } = explanation;
  return (
    <div className="space-y-3 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        How ticket #{ticket} was drawn
      </div>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="rounded-lg border border-border/60 bg-card/40 p-3">
            <div className="text-sm font-medium text-foreground/90">{s.label}</div>
            <div className="mt-1 font-mono text-sm text-[hsl(var(--accent-1))]">{s.math}</div>
          </li>
        ))}
      </ol>
      {note && (
        <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
      )}
    </div>
  );
}
