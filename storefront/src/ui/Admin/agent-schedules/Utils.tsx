import classNames from "classnames";
import dayjs from "dayjs";
import { useClickOutside } from "fogbender-client/src/shared";
import { ChevronButton } from "fogbender-client/src/shared/ui/ChevronButton";
import { type PrimitiveAtom, useAtom } from "jotai";
import React from "react";

import TimeZones from "../../../data/timezones.json";

import SelectSearch from "./SelectSearch";

export const DaysOfWeek = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
  7: "sunday",
};

type TimeLapseIndicator = {
  options: {
    activeLinePosition: number;
    className?: string;
    currentTime: string;
    distanceCoveredInSec: number;
    initialPosition: number;
    timezone: string;
    totalDistance: number;
    position: string;
    getDisplacement: (timezone: string) => any;
  };
};

type WithInitialValue<Value> = {
  init: Value;
};

type TimezoneSelectorProps = {
  selectedTimezone: PrimitiveAtom<string> & WithInitialValue<string>;
};

const filterTimezones = (
  searchedTimezone: string | undefined,
  selectedTimezone: string | undefined
) => {
  const lowerCaseSearchedTimezone = searchedTimezone?.toLowerCase() || "";
  const lowerCaseSelectedTimezone = selectedTimezone?.toLowerCase() || "";

  return TimeZones.filter(t => {
    const lowerCaseTimezone = t.value.toLowerCase();
    return (
      lowerCaseTimezone.includes(lowerCaseSearchedTimezone) &&
      !lowerCaseTimezone.includes(lowerCaseSelectedTimezone)
    );
  });
};

const getFixed = (totalDistance: number) => {
  const secondsInDay = 86400;
  const minutesInDay = 1440;
  const hoursInDay = 24;

  const fixed = (time: number) => {
    return +(totalDistance / time).toFixed(4);
  };

  return {
    distanceCoveredInSec: fixed(secondsInDay),
    distanceCoveredInMin: fixed(minutesInDay),
    distanceCoveredInHour: fixed(hoursInDay),
  };
};

const calculateDisplacement = (timezone: string, totalDistance: number, headerHeight: number) => {
  const { distanceCoveredInSec, distanceCoveredInMin, distanceCoveredInHour } =
    getFixed(totalDistance);
  const now = dayjs(Date.now()).tz(timezone);
  const activeHour = now.get("hour");
  const activeMinute = now.get("minute");
  const activeSecond = now.get("second");

  return {
    currentDisplacement: +(
      headerHeight +
      (distanceCoveredInSec * activeSecond +
        distanceCoveredInMin * activeMinute +
        distanceCoveredInHour * activeHour)
    ).toFixed(4),
    distanceCoveredInHour,
    distanceCoveredInMin,
    distanceCoveredInSec,
  };
};

export const msUntilEndOfDay = (tzDayjs: dayjs.Dayjs) => {
  const endOfDay = tzDayjs.endOf("day");
  const difference = endOfDay.diff(tzDayjs, "millisecond");
  return difference;
};

export const getTotalDisplacement = (totalDistance: number, initialPosition: number = 0) => {
  return (timezone: string) => {
    return calculateDisplacement(timezone, totalDistance, initialPosition);
  };
};

export const TimeLapse = (props: TimeLapseIndicator) => {
  const {
    currentTime,
    className,
    distanceCoveredInSec,
    initialPosition,
    timezone,
    position,
    activeLinePosition,
    totalDistance,
  } = props.options;

  const [totalDisplacement, setTotalDisplacement] = React.useState(activeLinePosition);

  React.useEffect(() => {
    setTotalDisplacement(activeLinePosition);
  }, [timezone, activeLinePosition]);

  React.useEffect(() => {
    const setDisplacement = () => {
      setTotalDisplacement(prev => {
        return prev === totalDistance || prev > totalDistance
          ? initialPosition
          : +(prev + distanceCoveredInSec).toFixed(4);
      });
    };

    const timer = setInterval(setDisplacement, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [distanceCoveredInSec, initialPosition, totalDistance]);

  const defaultClassNames =
    "absolute bg-brand-pink-500 after:content-[''] after:bg-brand-pink-500 after:w-2 after:h-2 after:block after:rounded-full";

  return (
    <>
      <div
        title={currentTime}
        style={{ [position]: `${totalDisplacement}px` }}
        className={classNames(defaultClassNames, className)}
      />
    </>
  );
};

export const TimezoneSelector = ({ selectedTimezone }: TimezoneSelectorProps) => {
  const [timezone, setTimezone] = useAtom(selectedTimezone);

  const [searchTimezone, setSearchTimezone] = React.useState<undefined | string>();
  const [showTimezoneMenu, setShowTimezoneMenu] = React.useState(false);

  const menuRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setShowTimezoneMenu(false), !showTimezoneMenu);

  const timezonesToShow = React.useMemo(() => {
    return filterTimezones(searchTimezone, timezone).map((t, i) => ({
      id: `${i}`,
      displayLabel: t.label,
      option: <div className="p-2">{t.value}</div>,
      value: t.value,
    }));
  }, [searchTimezone, timezone]);

  return (
    <div ref={menuRef} className="relative cursor-pointer">
      <div
        className="w-52 p-2 cursor-pointer bg-gray-100 dark:bg-black font-body flex justify-between text-sm rounded-lg pl-4 "
        onClick={() => {
          setShowTimezoneMenu(s => !s);
        }}
      >
        <span>{timezone || "Select timezone"}</span>
        <span>
          <ChevronButton isOpen={showTimezoneMenu} />
        </span>
      </div>
      {showTimezoneMenu && (
        <div
          className={classNames(
            "z-20 absolute top-12 rounded-md left-0 max-w-80 py-2 bg-white dark:bg-black fog:box-shadow-m"
          )}
        >
          <SelectSearch
            placeholder="Search timezone"
            inputSearchValue={searchTimezone}
            setInputSearchValue={setSearchTimezone}
            options={timezonesToShow}
            onChange={o => {
              setTimezone(o.value);
              setSearchTimezone(undefined);
              setShowTimezoneMenu(false);
            }}
            showOptions={!!timezonesToShow.length}
          />
        </div>
      )}
    </div>
  );
};

export const HiddenOnSmallScreen = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="hidden lg:block">{children}</div>
      <p className="block lg:hidden og:text-caption-l">
        This feature is exclusively accessible on screens with a width exceeding 1024 pixels.
      </p>
    </>
  );
};
