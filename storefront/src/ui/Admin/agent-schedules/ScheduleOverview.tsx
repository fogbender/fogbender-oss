import clsx from "classnames";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { Avatar, Icons, ThinButton } from "fogbender-client/src/shared";
import { atom, useAtom } from "jotai";
import React from "react";

import { useDayjsInTimezone } from "../../useDayjsInTimezone";

import { Layout } from "./Schedules";
import {
  DaysOfWeek,
  getTotalDisplacement,
  HiddenOnSmallScreen,
  TimeLapse,
  TimezoneSelector,
} from "./Utils";

dayjs.extend(isoWeek); // Gets or sets the ISO day of the week with 1 being Monday and 7 being Sunday.

const CELL_WIDTH = 105; // width of each grid cell.
const SUNDAY_KEY = 7;

const getDisplacement = getTotalDisplacement(CELL_WIDTH);

type DayKeys = keyof typeof DaysOfWeek;

type Dayjs = dayjs.Dayjs;

type HeaderProps = {
  dayjs: Dayjs;
  setDayjs: React.Dispatch<React.SetStateAction<Dayjs>>;
};

type MonthTitle = Record<string, Dayjs>;

type ChangeTime = "next" | "prev";

type WeekDays = {
  date: number;
  day: string;
  today: boolean;
  dateObj: dayjs.Dayjs;
};

type WeekViewProps = HeaderProps & {
  weekDays: WeekDays[];
};

export const selectedTimezoneAtom = atom<string>(dayjs.tz.guess());
const monthTitleAtom = atom<MonthTitle>({});

export const ScheduleOverview = React.memo(() => {
  const { tzDayjs, setTzDayjs } = useDayjsInTimezone(selectedTimezoneAtom);

  const weekStartDayjs = tzDayjs.startOf("isoWeek");

  const monthStartDayjs = tzDayjs.startOf("month");
  return (
    <Layout>
      <HiddenOnSmallScreen>
        <Header dayjs={monthStartDayjs} setDayjs={setTzDayjs} />
        <Main dayjs={weekStartDayjs} setDayjs={setTzDayjs} />
      </HiddenOnSmallScreen>
    </Layout>
  );
});

const Header = (props: HeaderProps) => {
  const { dayjs, setDayjs } = props;

  const [monthTitle] = useAtom(monthTitleAtom);

  const [month, setMonth] = React.useState(dayjs.format("MMMM YYYY"));

  React.useEffect(() => {
    if (Object.keys(monthTitle).length > 1) {
      // If the current week falls between two months, we'd like to show both months in the title.
      const newMonthTitle = Object.values(monthTitle).map(mt => mt.format("MMM YYYY"));

      setMonth(newMonthTitle.join(" - "));
    } else {
      setMonth(dayjs.format("MMMM YYYY"));
    }
  }, [monthTitle, dayjs]);

  const defaultIconClass = "h-5 w-5 border-rounded cursor-pointer";

  const findMaxDate = (dates: dayjs.Dayjs[]) => {
    const [d1, d2] = dates;

    return d2.isAfter(d1) ? d2 : d1;
  };

  const changeMonth = (m: ChangeTime) => {
    const titleValues = Object.values(monthTitle);

    const newDayjs = titleValues.length > 1 ? findMaxDate(titleValues) : dayjs;

    switch (m) {
      case "prev": {
        setDayjs(newDayjs.subtract(1, "month").startOf("month"));
        break;
      }
      case "next": {
        setDayjs(newDayjs.add(1, "month").startOf("month"));
        break;
      }
    }
  };
  return (
    <div className="flex pb-4 justify-between font-admin items-center border-0 border-solid border-gray-400 border-b select-none">
      <div className="flex gap-x-3 items-center text-xl">
        <div className="flex items-center h-full">
          <div className="h-full rounded-full hover:bg-gray-100">
            <div title="Previous Month" onClick={() => changeMonth("prev")}>
              <Icons.ChevronRight className={clsx(defaultIconClass, "rotate-180")} />
            </div>
          </div>
          <div
            title="Next Month"
            className="h-full rounded-full hover:bg-gray-100"
            onClick={() => changeMonth("next")}
          >
            <Icons.ChevronRight className={clsx(defaultIconClass)} />
          </div>
        </div>
        <div>{month}</div>
      </div>
      <TimezoneSelector selectedTimezone={selectedTimezoneAtom} />
    </div>
  );
};

const Main = (props: HeaderProps) => {
  const { dayjs: tzDayjs, setDayjs } = props;

  const [timezone] = useAtom(selectedTimezoneAtom);

  const [today] = React.useState(dayjs.tz(Date.now(), timezone));

  const weekDays = React.useMemo(() => getWeekDays(tzDayjs, today), [tzDayjs, today]);

  const changeWeek = (week: ChangeTime) => {
    switch (week) {
      case "prev": {
        const prevWeek = tzDayjs.subtract(7, "day");
        setDayjs(prevWeek);
        break;
      }
      case "next": {
        const nextWeek = tzDayjs.add(7, "day");
        setDayjs(nextWeek);
        break;
      }
    }
  };

  const formattedWeekString =
    tzDayjs.format("MMM DD") + " - " + tzDayjs.add(6, "day").format("MMM DD");

  return (
    <div className="h-[500px] overflow-auto fbr-scrollbar mt-6 relative w-[874px]">
      <div className="flex sticky top-0 bg-white dark:bg-gray-800 mb-4 z-10 pb-2">
        <div className="w-28 flex flex-col gap-2">
          <div className="whitespace-nowrap">{formattedWeekString}</div>
          <div className="flex gap-2 items-center">
            <ThinButton
              title="Previous Week"
              onClick={() => changeWeek("prev")}
              className="rotate-180"
            >
              <Icons.ChevronRight />
            </ThinButton>
            <ThinButton title="Current Week" onClick={() => setDayjs(today)}>
              <span className=" block h-[14px] w-[14px] rotate-180">&#x21bb;</span>
            </ThinButton>
            <ThinButton title="Next Week" onClick={() => changeWeek("next")}>
              <Icons.ChevronRight />
            </ThinButton>
          </div>
        </div>
        <WeekView weekDays={weekDays} dayjs={tzDayjs} setDayjs={setDayjs} />
      </div>
      <div>
        <AgentsView weekDays={weekDays} />
      </div>
    </div>
  );
};

const WeekView = (props: WeekViewProps) => {
  const { weekDays } = props;

  const [, setWeekTitle] = useAtom(monthTitleAtom);

  React.useEffect(() => {
    const monthtTitles = weekDays.map(wd => [wd.dateObj.format("MMMM"), wd.dateObj]);

    setWeekTitle(Object.fromEntries(monthtTitles));
  }, [weekDays, setWeekTitle]);

  return (
    <div className="w-[calc(100%-96px)]">
      <ul className="flex list-none justify-around">
        {weekDays.map((w, i) => {
          return (
            <li
              title={w.dateObj.format("DD MMMM")}
              key={i}
              className={clsx(
                "w-10 gap-2 flex flex-col text-center text-black dark:text-white flex-shrink-0",
                w.today && "text-brand-pink-500"
              )}
            >
              <span>{w.day}</span>
              <span
                className={clsx("rounded-full", {
                  "bg-brand-pink-500 text-white": w.today,
                  "hover:bg-gray-100 dark:hover:bg-black cursor-pointer": !w.today,
                })}
              >
                {w.date}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const AgentsView = (props: Pick<WeekViewProps, "weekDays">) => {
  const { weekDays } = props;

  const [timezone] = useAtom(selectedTimezoneAtom);

  const { tzDayjs } = useDayjsInTimezone(selectedTimezoneAtom);

  const { currentDisplacement, distanceCoveredInSec } = React.useMemo(() => {
    return getDisplacement(timezone);
  }, [timezone]);

  const options = {
    activeLinePosition: currentDisplacement,
    className: "after:-translate-y-1/2 after:bottom-0 after:-translate-x-1/2 w-[1px] h-full top-0",
    currentTime: tzDayjs.format("hh:mm:ss"),
    distanceCoveredInSec,
    getDisplacement,
    initialPosition: 0,
    timezone,
    totalDistance: CELL_WIDTH,
    position: "left",
  };

  return (
    <div className="flex relative">
      <div className="w-28 mr-[1px]">
        <ul>
          {Array.from({ length: 15 }, (_, i) => i).map(i => (
            <li
              className="text-center odd:bg-gray-100 dark:odd:bg-black leading-6 py-2 flex items-center rounded-l-xl px-1 gap-2"
              key={i}
            >
              <Avatar withTitle={false} name={"Soroker"} size={24} />
              <span className="text-sm truncate">Soroker</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1">
        <ul className="flex justify-around h-full">
          {weekDays.map((weekDay, idx) => (
            <li className="text-center relative" key={idx}>
              <div className="flex flex-col text-center ">
                {Array.from({ length: 15 }, (_, j) => j).map(j => (
                  <span
                    className={clsx(
                      "leading-6 py-2 px-8 odd:bg-gray-100 dark:odd:bg-black",
                      weekDay.dateObj.isoWeekday() === SUNDAY_KEY && "odd:rounded-r-xl"
                    )}
                    key={j}
                  >
                    00:08
                  </span>
                ))}
              </div>
              {weekDay.today && (
                <TimeLapse
                  options={{
                    ...options,
                    className: clsx(options.className),
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const getWeekDays = (tzDayjs: dayjs.Dayjs, today: dayjs.Dayjs) => {
  const endOfWeek = tzDayjs.endOf("isoWeek");

  const week = [];

  let dateToCompare = tzDayjs.clone();

  while (dateToCompare.isSame(endOfWeek, "day") || dateToCompare.isBefore(endOfWeek, "day")) {
    const date = dateToCompare.get("date");

    const weekDay = dateToCompare.isoWeekday();

    const day = DaysOfWeek[weekDay as DayKeys];

    week.push({
      date,
      day: day?.substring(0, 3).toUpperCase(),
      today: today.isSame(dateToCompare, "day"),
      dateObj: dateToCompare,
    });

    dateToCompare = dateToCompare.add(1, "day");
  }

  return week;
};
