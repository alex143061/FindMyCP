export function formatDateTime(value: string | null): string {
  if (!value) return 'Not yet recorded';
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatCoordinate(value: number | null | undefined): string {
  return typeof value === 'number' ? value.toFixed(5) : '--';
}

export function formatAccuracy(value: number | null | undefined): string {
  return typeof value === 'number' ? `±${Math.round(value)} m` : 'Unavailable';
}
