import classNames from "classnames";
import {
  Agent,
  Avatar,
  Icons,
  LinkButton,
  ThickButton,
  ThinButton,
  useInputWithError,
} from "fogbender-client/src/shared";
import React from "react";
import { useQuery } from "react-query";

import { Vendor } from "../../../redux/adminApi";
import { apiServer, queryKeys } from "../../client";
import { DaysOfWeek, HiddenOnSmallScreen } from "./Utils";

const AgentLaneDefaultValue = [
  { num: 0, agent: undefined },
  { num: 1, agent: undefined },
  { num: 2, agent: undefined },
  { num: 3, agent: undefined },
];

type AgentLane = {
  agent: Agent;
  num: number;
};

type ShiftModes = "add" | "edit" | undefined;

type ShiftName = {
  name: string | undefined;
};

type LaneAssignmentState = {
  agent: Agent | undefined;
  num: number;
};

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

export const Schedules = ({ vendor }: { vendor: Vendor; ourId: string }) => {
  const [shiftMode, setShiftMode] = React.useState<ShiftModes>();

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents(vendor.id),
    queryFn: () => apiServer.get(`/api/vendors/${vendor.id}/agents`).json<Agent[]>(),
  });

  return (
    <>
      <Layout className="py-4">
        {shiftMode === "edit" && agents ? (
          <Shift
            shift={{ name: undefined }}
            vendor={vendor}
            agents={agents}
            shiftMode={shiftMode}
            setShiftMode={mode => setShiftMode(mode)}
          />
        ) : (
          <ScheduleList onEditSchedule={() => setShiftMode("edit")} />
        )}
      </Layout>

      {shiftMode === "add" && agents && (
        <Layout className="py-4">
          <Shift
            shift={{ name: undefined }}
            vendor={vendor}
            agents={agents}
            shiftMode={shiftMode}
            setShiftMode={mode => setShiftMode(mode)}
          />
        </Layout>
      )}

      <Layout className="px-4 py-4">
        <ThinButton disabled={shiftMode === "add"} onClick={() => setShiftMode("add")}>
          Add a shift
        </ThinButton>
      </Layout>
    </>
  );
};

const Shift = ({
  shift,
  shiftMode,
  setShiftMode,
}: {
  shift: ShiftName;
  vendor: Vendor;
  agents: Agent[];
  shiftMode: ShiftModes;
  setShiftMode: (mode: ShiftModes) => void;
}) => {
  const [laneAssignments] = React.useState<LaneAssignmentState[]>(AgentLaneDefaultValue);

  const [newShiftName, setNewShiftName] = React.useState<string>();

  const [editingShiftName, setEditingShiftName] = React.useState(false);

  const [shiftName, shiftNameInput, ,] = useInputWithError({
    className: "!h-12 border-0 w-60",
    title: "Shift name",
    placeholder: shift.name || "Shift name", // XXX fix this
    onEnter: () => {
      if (shiftName) {
        setEditingShiftName(false);
        setNewShiftName(shiftName);
      }
    },
  });

  const assignedAgents = React.useMemo(
    () => laneAssignments.filter(la => !!la.agent) as AgentLane[],
    [laneAssignments]
  );

  const deleteSchedule = () => {};

  return (
    <HiddenOnSmallScreen>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex justify-between items-center h-12">
          {editingShiftName ? (
            <div className="flex gap-2 items-center">
              {shiftNameInput}
              <LinkButton
                className={classNames("h-12 !w-28")}
                onClick={() => {
                  setNewShiftName(undefined);
                  setEditingShiftName(false);
                }}
              >
                Cancel
              </LinkButton>
              <ThickButton
                className={classNames(
                  "h-12 !w-28",
                  "transition-opacity duration-100 ease-in",
                  newShiftName !== shiftName ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={() => {
                  setNewShiftName(shiftName);
                  setEditingShiftName(false);
                }}
              >
                Save
              </ThickButton>
            </div>
          ) : (
            <div className="flex text-2xl font-prompt gap-2 items-center">
              <span>{shiftName}</span>
              <span
                onClick={() => {
                  setNewShiftName(shiftName);
                  setEditingShiftName(true);
                }}
                className="cursor-pointer text-gray-500 hover:text-brand-red-500"
              >
                <Icons.Pencil className="w-5" />
              </span>
            </div>
          )}
          <div className="flex items-center gap-8">
            {shiftMode === "edit" && (
              <div
                onClick={deleteSchedule}
                className="cursor-pointer text-gray-500 hover:text-brand-red-500"
              >
                <Icons.Trash className="w-6" />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 md:justify-between justify-center"></div>
        <div className="relative h-[738px]"></div>
        <div className="flex items-center justify-end gap-2">
          <LinkButton onClick={() => setShiftMode(undefined)}>Cancel Changes</LinkButton>
          <ThickButton className="!px-4 !py-3">Save Schedule</ThickButton>
        </div>
      </div>
      {!!assignedAgents.length && (
        <div className="absolute left-0 -translate-x-1/2 bottom-16"></div>
      )}
    </HiddenOnSmallScreen>
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
