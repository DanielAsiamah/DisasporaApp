export function parseReminderTime(value = '19:00') {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  const hour = Number(match?.[1]);
  const minute = Number(match?.[2]);
  if (!match || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: 19, minute: 0, value: '19:00' };
  }
  return { hour, minute, value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
}

export function formatReminderTime(value = '19:00') {
  const { hour, minute } = parseReminderTime(value);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}
