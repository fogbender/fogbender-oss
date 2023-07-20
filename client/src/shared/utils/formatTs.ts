import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export function usToMs(us: number) {
  return Math.floor(us / 1000);
}

export const formatTs = (us: number) =>
  dayjs(usToMs(us)).format(
    "HH:mm, MMM D" + (dayjs(usToMs(us)).year() !== dayjs().year() ? ", YYYY" : "")
  );

export const formatRosterTs = (us: number) => {
  const ts = dayjs(usToMs(us));
  const format =
    ts.year() !== dayjs().year()
      ? "HH:mm, MMM D, YYYY"
      : ts.date() !== dayjs().date() || ts.month() !== dayjs().month()
      ? "HH:mm, MMM D"
      : "HH:mm";
  return ts.format(format);
};

export const formatRoomTs = (us: number) =>
  dayjs(usToMs(us)).format(
    "MMM D" + (dayjs(usToMs(us)).year() !== dayjs().year() ? ", YYYY" : "") + ", HH:mm"
  );
