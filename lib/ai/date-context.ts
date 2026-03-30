export const IST_TIME_ZONE = 'Asia/Kolkata';

export type ISTDateContext = {
  today: string;
  now: string;
};

export function getCurrentISTDateContext(now: Date = new Date()): ISTDateContext {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  const today = `${get('year')}-${get('month')}-${get('day')}`;

  return {
    today,
    now: `${today} ${get('hour')}:${get('minute')}:${get('second')} IST`,
  };
}

export function getFutureISTDates(days: number, now: Date = new Date()): string[] {
  const { today } = getCurrentISTDateContext(now);
  const start = new Date(`${today}T00:00:00.000Z`);
  const dates: string[] = [];

  for (let offset = 1; offset <= days; offset += 1) {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + offset);
    dates.push(next.toISOString().slice(0, 10));
  }

  return dates;
}

export function buildAIDateContextBlock(now: Date = new Date()): string {
  const current = getCurrentISTDateContext(now);
  const nextSevenDates = getFutureISTDates(7, now);

  return [
    `Current date/time: ${current.now}`,
    `Time zone: ${IST_TIME_ZONE}`,
    `Today's date in IST: ${current.today}`,
    `The next 7 calendar dates in IST are: ${nextSevenDates.join(', ')}.`,
  ].join('\n');
}
