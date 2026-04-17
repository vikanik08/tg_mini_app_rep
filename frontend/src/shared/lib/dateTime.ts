type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function readCurrentUserTimezone() {
  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const raw = localStorage.getItem("current_user");

  if (!raw) return fallback;

  try {
    const user = JSON.parse(raw) as { timezone?: string | null };
    return user.timezone || fallback;
  } catch {
    return fallback;
  }
}

function parseDateTimeParts(dateKey: string, timeValue: string): DateTimeParts {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);

  return { year, month, day, hour, minute };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - date.getTime();
}

export function getUserTimezone() {
  return readCurrentUserTimezone();
}

export function zonedDateTimeToUtcIso(
  dateKey: string,
  timeValue: string,
  timeZone = getUserTimezone(),
) {
  const { year, month, day, hour, minute } = parseDateTimeParts(dateKey, timeValue);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcMs = localAsUtc;

  for (let index = 0; index < 2; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = localAsUtc - offset;
  }

  return new Date(utcMs).toISOString();
}

export function formatDateTimeInUserTimezone(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: getUserTimezone(),
    ...options,
  }).format(date);
}

export function formatDateKeyInUserTimezone(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getUserTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}
