import clsx from "classnames";
import dayjs from "dayjs";
import { Icons, ThinButton } from "fogbender-client/src/shared";
import isoWeek from "dayjs/plugin/isoWeek";
import { atom, useAtom } from "jotai";
import React from "react";
import { useDayjsInTimezone } from "../../useDayjsInTimezone";
import { Layout } from "./Schedules";
import { DaysOfWeek, HiddenOnSmallScreen } from "./Utils";

dayjs.extend(isoWeek); // Gets or sets the ISO day of the week with 1 being Monday and 7 being Sunday.
type DayKeys = keyof typeof DaysOfWeek;

type Dayjs = dayjs.Dayjs;

type HeaderProps = {
  dayjs: Dayjs;
  setDayjs: React.Dispatch<React.SetStateAction<Dayjs>>;
};

type MonthTitle = Record<string, Dayjs>;

type MonthTransition = "next" | "prev";

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

  const changeMonth = (m: MonthTransition) => {
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
    </div>
  );
};

const Main = (props: HeaderProps) => {
  const { dayjs: tzDayjs, setDayjs } = props;

  const [timezone] = useAtom(selectedTimezoneAtom);

  const [today] = React.useState(dayjs.tz(Date.now(), timezone));

  const weekDays = React.useMemo(() => getWeekDays(tzDayjs, today), [tzDayjs, today]);

  const formattedWeekString =
    tzDayjs.format("MMM DD") + " - " + tzDayjs.add(6, "day").format("MMM DD");

  return (
    <div className="h-[500px] overflow-auto fbr-scrollbar mt-6 relative w-[874px]">
      <div className="flex sticky top-0 bg-white mb-4 z-10 pb-2">
        <div className="w-28 flex flex-col gap-2">
          <div className="whitespace-nowrap">{formattedWeekString}</div>
          <div className="flex gap-2 items-center">
            <ThinButton title="Previous Week" className="rotate-180">
              <Icons.ChevronRight />
            </ThinButton>
            <ThinButton title="Current Week" onClick={() => setDayjs(today)}>
              <span className=" block h-[14px] w-[14px] rotate-180">&#x21bb;</span>
            </ThinButton>
            <ThinButton title="Next Week">
              <Icons.ChevronRight />
            </ThinButton>
          </div>
        </div>
        <WeekView weekDays={weekDays} dayjs={tzDayjs} setDayjs={setDayjs} />
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
                "w-10 gap-2 flex flex-col text-center text-black flex-shrink-0",
                w.today && "text-brand-pink-500"
              )}
            >
              <span>{w.day}</span>
              <span
                className={clsx("rounded-full", {
                  "bg-brand-pink-500 text-white": w.today,
                  "hover:bg-gray-100 cursor-pointer": !w.today,
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

const getWeekDays = (tzDayjs: dayjs.Dayjs, today: dayjs.Dayjs) => {
  const endOfWeek = tzDayjs.endOf("isoWeek");

  const week = [];

  let dateToCompare = tzDayjs.clone();

  while (dateToCompare.isSame(endOfWeek, "day") || dateToCompare.isBefore(endOfWeek, "day")) {
    const date = dateToCompare.get("date");

    const weekDay = dateToCompare.isoWeekday();

    const day = DaysOfWeek[weekDay as DayKeys];

    week.push({
      date: date,
      day: day?.substring(0, 3).toUpperCase(),
      today: today.isSame(dateToCompare, "day"),
      dateObj: dateToCompare,
    });

    dateToCompare = dateToCompare.add(1, "day");
  }

  return week;
};
