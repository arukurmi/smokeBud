export const PRESENCE_WINDOW_MS = 60_000;

export function presenceCutoff(now: Date): Date {
  return new Date(now.getTime() - PRESENCE_WINDOW_MS);
}

export function isActive(lastHeartbeatAt: Date, now: Date): boolean {
  return lastHeartbeatAt.getTime() >= presenceCutoff(now).getTime();
}
