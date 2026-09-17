'use client';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { Concept } from '@/lib/manifest';
import { levelPath, levels, type LevelId } from '@/lib/levels';

type Props = {
  level: LevelId;
  explode: number;
  logical: boolean;
  selected: Concept | null;
  /** `null` until the viewer has reported for the first time. */
  count: number | null;
  onNavigate: (level: LevelId) => void;
};

export default function StageHeading({
  level,
  explode,
  logical,
  selected,
  count,
  onNavigate,
}: Props) {
  const scale = levels[level],
    path = levelPath(level);
  return (
    <section className="stage-heading">
      <div>
        <h1>
          {explode === 100
            ? 'Component inventory'
            : explode > 0
              ? logical
                ? 'Resources, separated'
                : 'Coming apart'
              : scale.title}
        </h1>
        <div className="stage-meta">
          <p className="eyebrow">{scale.caption}</p>
          <nav className="breadcrumbs" aria-label="Component hierarchy">
            {path.length > 1 && (
              <button
                aria-label="Back one level"
                onClick={() => onNavigate(path[path.length - 2])}
              >
                <ArrowLeft size={14} />
              </button>
            )}
            {path.map((id, i) => (
              <span key={id}>
                {i > 0 && <ChevronRight size={12} />}
                <button
                  aria-current={id === level ? 'page' : undefined}
                  onClick={() => onNavigate(id)}
                >
                  {levels[id].name}
                </button>
              </span>
            ))}
            {selected && selected.shortName !== scale.name && (
              <span>
                <ChevronRight size={12} />
                <span className="crumb-selected">{selected.shortName}</span>
              </span>
            )}
          </nav>
        </div>
      </div>
      {count !== null && (
        <output
          className="stage-counter"
          aria-live="polite"
          aria-label={`${count} visible parts`}
        >
          <strong>{count}</strong>
          <span>visible parts</span>
        </output>
      )}
    </section>
  );
}
