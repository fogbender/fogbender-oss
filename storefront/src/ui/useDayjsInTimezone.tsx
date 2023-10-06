import React from "react";
import { useAtom, PrimitiveAtom } from "jotai";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import isoWeek from "dayjs/plugin/isoWeek";

dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(timezone);

type WithInitialValue<Value> = {
  init: Value;
};

const initializeTzDayjs = (timezone: string) => {
  return dayjs.tz(Date.now(), timezone);
};

export const useDayjsInTimezone = (
  selectedTimezone: PrimitiveAtom<string> & WithInitialValue<string>
) => {
  const [timezone] = useAtom(selectedTimezone);

  const [tzDayjs, setTzDayjs] = React.useState(initializeTzDayjs(timezone));

  React.useEffect(() => {
    setTzDayjs(initializeTzDayjs(timezone));
  }, [timezone]);

  return { tzDayjs, setTzDayjs };
};
