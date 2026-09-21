export function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatMoment(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("fr-CA", {
    day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit",
    hourCycle: "h23", timeZone: "America/Toronto",
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("day")} ${get("month")} ${get("year")} à ${get("hour")} h ${get("minute")}`;
}

export function formatDay(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat("fr-CA", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(date);
}
