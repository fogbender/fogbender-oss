import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { type PrimitiveAtom, useAtom } from "jotai";
import React from "react";

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
