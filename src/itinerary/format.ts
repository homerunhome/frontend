export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(`${value}T00:00:00`));
}

export function formatTime(value: string) {
  const date = value.includes('T') ? new Date(value) : new Date(`1970-01-01T${value}`);
  return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}
