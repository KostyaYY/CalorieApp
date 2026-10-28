const MONTHS = [
  'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
  'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня',
];
const WEEKDAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/** Local date as `YYYY-MM-DD`. */
export function toKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toKey(new Date());
}

export function addDays(key: string, days: number) {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

export function weekdayShort(key: string) {
  return WEEKDAYS[fromKey(key).getDay()];
}

export function formatDay(key: string) {
  const today = todayKey();
  if (key === today) return 'Сьогодні';
  if (key === addDays(today, -1)) return 'Вчора';
  const d = fromKey(key);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${weekdayShort(key)}, ${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}
