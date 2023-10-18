import classNames from "classnames";
import { Avatar, ThinButton } from "fogbender-client/src/shared";
import React from "react";

import { DaysOfWeek } from "./Utils";

type ShiftModes = "add" | "edit" | undefined;

export const Layout = (props: { children: React.ReactNode; className?: string }) => {
  const { children, className } = props;
  return (
    <div
      className={classNames("w-full bg-white p-6 rounded-xl fog:box-shadow-s relative", className)}
    >
      {children}
    </div>
  );
};

export const Schedules = () => {
  const [, setShiftMode] = React.useState<ShiftModes>();

  return (
    <Layout className="px-4 py-4">
      <ScheduleList onEditSchedule={() => setShiftMode("edit")} />
    </Layout>
  );
};

const ScheduleList = ({ onEditSchedule }: { onEditSchedule: () => void }) => {
  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex justify-between">
          <div className="font-prompt text-lg md:text-[25px] leading-9">Support team Tier-1</div>
          <div>
            <ThinButton onClick={onEditSchedule}>edit schedule</ThinButton>
          </div>
        </div>
        <AgentScheduleCard />
      </div>
    </div>
  );
};

const AgentScheduleCard = () => {
  return (
    <div className="flex md:flex-row gap-3 flex-col items-center justify-center flex-wrap">
      <div className="px-3 flex-shrink-0 w-52 py-2 bg-gray-100 rounded-lg">
        <div className="flex flex-col gap-1">
          <div className="flex gap-1 items-center">
            <div>
              <Avatar
                size={25}
                url="https://lh3.googleusercontent.com/a/AAcHTtcO_2eBIe1tUj3ChKkdhhXNnSCJ5n35lJj7FdNDbgbXww=s96-c"
              />
            </div>
            <div className="fog:text-caption-m">Andrey Kravstov</div>
          </div>
          <div className="flex flex-col gap-1">
            {Object.values(DaysOfWeek).map((key, i) => {
              return (
                <div className="text-gray-500 flex gap-1 fog:text-caption-m font-normal" key={i}>
                  <div className="w-8">
                    {key.substring(0, 1).toUpperCase() + key.substring(1, 3)}
                  </div>
                  {key === "saturday" ? <span>&mdash;</span> : <div>00:00 &mdash; 08:00</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="px-3 flex-shrink-0 w-52 py-2 bg-gray-100 rounded-lg">
        <div className="flex flex-col gap-1">
          <div className="flex gap-1 items-center">
            <div>
              <Avatar
                size={25}
                url="https://lh3.googleusercontent.com/a/AAcHTtcO_2eBIe1tUj3ChKkdhhXNnSCJ5n35lJj7FdNDbgbXww=s96-c"
              />
            </div>
            <div className="fog:text-caption-m">Andrey Kravstov</div>
          </div>
          <div className="flex flex-col gap-1">
            {Object.values(DaysOfWeek).map((key, i) => {
              return (
                <div className="text-gray-500 flex gap-1 fog:text-caption-m font-normal" key={i}>
                  <div className="w-8">
                    {key.substring(0, 1).toUpperCase() + key.substring(1, 3)}
                  </div>
                  {key === "saturday" ? <span>&mdash;</span> : <div>00:00 &mdash; 08:00</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="px-3 flex-shrink-0 w-52 py-2 bg-gray-100 rounded-lg">
        <div className="flex flex-col gap-1">
          <div className="flex gap-1 items-center">
            <div>
              <Avatar
                size={25}
                url="https://lh3.googleusercontent.com/a/AAcHTtcO_2eBIe1tUj3ChKkdhhXNnSCJ5n35lJj7FdNDbgbXww=s96-c"
              />
            </div>
            <div className="fog:text-caption-m">Andrey Kravstov</div>
          </div>
          <div className="flex flex-col gap-1">
            {Object.values(DaysOfWeek).map((key, i) => {
              return (
                <div className="text-gray-500 flex gap-1 fog:text-caption-m font-normal" key={i}>
                  <div className="w-8">
                    {key.substring(0, 1).toUpperCase() + key.substring(1, 3)}
                  </div>
                  {key === "saturday" ? <span>&mdash;</span> : <div>00:00 &mdash; 08:00</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="px-3 flex-shrink-0 w-52 py-2 bg-gray-100 rounded-lg">
        <div className="flex flex-col gap-1">
          <div className="flex gap-1 items-center">
            <div>
              <Avatar
                size={25}
                url="https://lh3.googleusercontent.com/a/AAcHTtcO_2eBIe1tUj3ChKkdhhXNnSCJ5n35lJj7FdNDbgbXww=s96-c"
              />
            </div>
            <div className="fog:text-caption-m">Andrey Kravstov</div>
          </div>
          <div className="flex flex-col gap-1">
            {Object.values(DaysOfWeek).map((key, i) => {
              return (
                <div className="text-gray-500 flex gap-1 fog:text-caption-m font-normal" key={i}>
                  <div className="w-8">
                    {key.substring(0, 1).toUpperCase() + key.substring(1, 3)}
                  </div>
                  {key === "saturday" ? <span>&mdash;</span> : <div>00:00 &mdash; 08:00</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
