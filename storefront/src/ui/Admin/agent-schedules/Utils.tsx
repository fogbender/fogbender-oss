import classNames from "classnames";
import dayjs from "dayjs";
import React from "react";

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
