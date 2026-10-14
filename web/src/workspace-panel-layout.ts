import type { DisplayConfig } from './workspace-types.ts';

/** A width or collapse change needs CSS and dynamic readouts, not rebuilt settings or curves. */
export function samePanelContent(previous: DisplayConfig | undefined,
  next: DisplayConfig): boolean {
  if (!previous || previous.kind !== next.kind) return false;
  const before = previous as unknown as Record<string, unknown>;
  const after = next as unknown as Record<string, unknown>;
  const keys = Object.keys(after);
  return keys.length === Object.keys(before).length && keys.every(key =>
    key === 'columnSpan' || key === 'collapsed' || before[key] === after[key]);
}
