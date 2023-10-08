import clsx from "classnames";
import dayjs from "dayjs";
import { Icons } from "fogbender-client/src/shared";
import { atom, useAtom } from "jotai";
import React from "react";
import { useDayjsInTimezone } from "../../useDayjsInTimezone";
import { Layout } from "./Schedules";
import { HiddenOnSmallScreen } from "./Utils";

type Dayjs = dayjs.Dayjs;

type HeaderProps = {
  dayjs: Dayjs;
  setDayjs: React.Dispatch<React.SetStateAction<Dayjs>>;
};

type MonthTitle = Record<string, Dayjs>;

type MonthTransition = "next" | "prev";

export const selectedTimezoneAtom = atom<string>(dayjs.tz.guess());
const monthTitleAtom = atom<MonthTitle>({});

export const ScheduleOverview = React.memo(() => {
  const { tzDayjs, setTzDayjs } = useDayjsInTimezone(selectedTimezoneAtom);

  const monthStartDayjs = tzDayjs.startOf("month");
  return (
    <Layout>
      <HiddenOnSmallScreen>
        <Header dayjs={monthStartDayjs} setDayjs={setTzDayjs} />
        <Main />
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

const Main = () => {
  return (
    <div className="h-[500px] overflow-auto fbr-scrollbar mt-6 relative w-[874px]">
      <div className="flex sticky top-0 bg-white mb-4 z-10 pb-2">
        <div className="w-28 flex flex-col gap-2" />
      </div>
    </div>
  );
};
