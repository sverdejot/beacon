import type { CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', style, width, height }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card">
      <Skeleton className="skeleton-title" style={{ marginBottom: '0.75rem' }} />
      <Skeleton className="skeleton-value" />
      <Skeleton className="skeleton-text" style={{ width: '70%', marginTop: '0.5rem' }} />
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card chart-card">
      <Skeleton className="skeleton-title" style={{ marginBottom: '1rem' }} />
      <Skeleton className="skeleton-chart" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="card table-card">
      <Skeleton className="skeleton-title" style={{ marginBottom: '1rem' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height="2.5rem" />
        ))}
      </div>
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div className="grid grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
