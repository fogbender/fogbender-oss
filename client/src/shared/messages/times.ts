import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(duration);
dayjs.extend(relativeTime);

function usToMs(us: number) {
  return Math.floor(us / 1000);
}

export const formatTs = (us: number) =>
  dayjs(usToMs(us)).format(
    "HH:mm, MMM D" + (dayjs(usToMs(us)).year() !== dayjs().year() ? ", YYYY" : "")
  );

const isTsCloseEnough = (ts1Microseconds: number, ts2Microseconds: number | undefined) => {
  if (ts2Microseconds) {
    const tsDiff = dayjs.duration(Math.abs((ts1Microseconds - ts2Microseconds) / 1000));
    return tsDiff.asMinutes() < 15;
  }
  return false;
};

export { dayjs, isTsCloseEnough };
