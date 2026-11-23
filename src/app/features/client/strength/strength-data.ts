import { DateTime } from 'luxon';
import { StrengthSession } from './strength.models';

export function sessionWeight(session: StrengthSession): number {
  return Math.max(0, ...session.sets.map((set) => set.weightKg));
}
export function orderedSessions(sessions: StrengthSession[]): StrengthSession[] {
  return [...sessions].sort(
    (a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt) || a.id.localeCompare(b.id),
  );
}
export function strengthChart(
  sessions: StrengthSession[],
  range: '12w' | 'all',
  now: DateTime = DateTime.now(),
) {
  const cutoff = now.setZone('Africa/Cairo').minus({ weeks: 12 }).startOf('day').toMillis();
  return orderedSessions(sessions)
    .filter((s) => range === 'all' || Date.parse(s.recordedAt) >= cutoff)
    .map((s) => ({ id: s.id, at: s.recordedAt, weight: sessionWeight(s) }));
}
export function weightChange(sessions: StrengthSession[]): number | null {
  const ordered = orderedSessions(sessions);
  return ordered.length < 2
    ? null
    : sessionWeight(ordered.at(-1)!) - sessionWeight(ordered.at(-2)!);
}
export function isNewBest(sessions: StrengthSession[]): boolean {
  const ordered = orderedSessions(sessions);
  return (
    ordered.length > 1 &&
    sessionWeight(ordered.at(-1)!) > Math.max(...ordered.slice(0, -1).map(sessionWeight))
  );
}
export function personalBestsThisMonth(
  sessions: StrengthSession[],
  now: DateTime = DateTime.now(),
): number {
  const best = new Map<string, number>();
  let total = 0;
  const month = now.setZone('Africa/Cairo').toFormat('yyyy-MM');
  for (const session of orderedSessions(sessions)) {
    const weight = sessionWeight(session);
    const previous = best.get(session.exerciseId);
    if (
      previous !== undefined &&
      weight > previous &&
      DateTime.fromISO(session.recordedAt).setZone('Africa/Cairo').toFormat('yyyy-MM') === month
    )
      total++;
    best.set(session.exerciseId, Math.max(previous ?? 0, weight));
  }
  return total;
}
export function chartGeometry(points: { at: string; weight: number }[]) {
  if (!points.length) return { line: '', area: '', coordinates: [] as { x: number; y: number }[] };
  const times = points.map((p) => Date.parse(p.at));
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights),
    max = Math.max(...weights);
  const pad = Math.max((max - min) * 0.15, 1);
  const start = Math.min(...times),
    span = Math.max(...times) - start;
  const coordinates = points.map((p, i) => ({
    x: span ? 25 + ((times[i] - start) / span) * 550 : 300,
    y: 190 - ((p.weight - min + pad) / (max - min + pad * 2)) * 160,
  }));
  const line = coordinates.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${coordinates.at(-1)!.x},210 L${coordinates[0].x},210 Z`;
  return { line, area, coordinates };
}
