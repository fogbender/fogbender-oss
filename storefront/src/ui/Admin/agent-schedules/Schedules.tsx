import classNames from "classnames";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import {
  Agent,
  Avatar,
  Icons,
  LinkButton,
  ThickButton,
  ThinButton,
  useClickOutside,
  useInputWithError,
} from "fogbender-client/src/shared";
import { atom, useAtom } from "jotai";
import React from "react";
import { useQuery } from "react-query";

import { Vendor } from "../../../redux/adminApi";
import { apiServer, queryKeys } from "../../client";
import { useDayjsInTimezone } from "../../useDayjsInTimezone";

import SelectSearch from "./SelectSearch";
import { DaysOfWeek, HiddenOnSmallScreen, TimezoneSelector, msUntilEndOfDay } from "./Utils";

dayjs.extend(timezone);

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

type AgentSchedule = {
  agentId: string;
  available: boolean;
  finishDate: number;
  finishTime: number;
  scheduleId: string;
  startDate: number;
  startTime: number;
  week: number | undefined;
};

type AgentViewProps = {
  name: string;
  image_url: string;
  size: number;
};

type DayProps = {
  currentDay: number;
  day: string;
  dayIndex: number;
  laneAssignments: AgentLane[];
  setWeekState: SetStateAction<WeekState>;
  weekState: WeekState;
};

type LaneAssignmentState = {
  agent: Agent | undefined;
  num: number;
};

type SelectionState = Record<
  Agent["id"],
  {
    available: boolean;
    startTime: { selectedDay: number; selectedHour: number };
  }
>;

type SetStateAction<T> = React.Dispatch<React.SetStateAction<T>>;

type ShiftModes = "add" | "edit" | undefined;

type ShiftName = {
  name: string | undefined;
};

type WeekState = {
  week: number | undefined;
  schedule: AgentSchedule[];
};

const selectedTimezone = atom<string>(dayjs.tz.guess());
const selectionStateAtom = atom<SelectionState>({});
const hintPositionAtom = atom<number | undefined>(undefined);

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
  agents,
  setShiftMode,
}: {
  shift: ShiftName;
  vendor: Vendor;
  agents: Agent[];
  shiftMode: ShiftModes;
  setShiftMode: (mode: ShiftModes) => void;
}) => {
  const [laneAssignments, setLaneAssignments] =
    React.useState<LaneAssignmentState[]>(AgentLaneDefaultValue);

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
            <TimezoneSelector selectedTimezone={selectedTimezone} />
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
        <div className="flex flex-wrap gap-3 md:justify-between justify-center">
          {laneAssignments.map(({ agent, num }) => (
            <LaneAssignment
              key={`lane-${num}`}
              agent={agent}
              agents={agents}
              assignAgent={agent => {
                setLaneAssignments(x => x.map(y => (y.num === num ? { ...y, agent } : y)));
              }}
            />
          ))}
        </div>
        <div className="relative h-[738px]">
          <Week laneAssignments={assignedAgents} />
        </div>
        <div className="flex items-center justify-end gap-2">
          <LinkButton onClick={() => setShiftMode(undefined)}>Cancel Changes</LinkButton>
          <ThickButton className="!px-4 !py-3">Save Schedule</ThickButton>
        </div>
      </div>
      {!!assignedAgents.length && (
        <div className="absolute left-0 -translate-x-1/2 bottom-16">
          <Hours />
        </div>
      )}
    </HiddenOnSmallScreen>
  );
};

const Hours = () => {
  const hours = Array.from({ length: 49 }, (_, i) => i);

  const [hintPosition] = useAtom(hintPositionAtom);

  return (
    <div className=" font-body rounded-xl fog:box-shadow bg-white px-2 pt-2 h-[608px]">
      {hours.map(h => (
        <div className="relative mb-2" key={h}>
          {h % 2 === 0 && (
            <span className={classNames("w-4 text-xs text-gray-400 block h-full")}>
              <span>{((h / 2) % 24).toString().padStart(2, "0")}</span>
            </span>
          )}
          {h === hintPosition && (
            <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-full h-4 font-bold border-l-4 border-brand-red-500" />
          )}
        </div>
      ))}
    </div>
  );
};

const Week = React.memo(({ laneAssignments }: { laneAssignments: AgentLane[] }) => {
  const days = Object.values(DaysOfWeek);

  const { tzDayjs } = useDayjsInTimezone(selectedTimezone);

  const timeRemaining = msUntilEndOfDay(tzDayjs);

  const timeLeft = React.useRef(timeRemaining);

  const [currentDay, setCurrentDay] = React.useState(tzDayjs.isoWeekday());

  const [weekState, setWeekState] = React.useState<WeekState>({
    week: undefined,
    schedule: [],
  });

  React.useEffect(() => {
    setCurrentDay(tzDayjs.isoWeekday());

    const timer = setInterval(() => {
      setCurrentDay(tzDayjs.isoWeekday());
    }, timeLeft.current);

    timeLeft.current = msUntilEndOfDay(tzDayjs);

    return () => {
      clearInterval(timer);
    };
  }, [tzDayjs]);

  return (
    <div className="flex">
      {days.map((d, i) => (
        <Day
          key={d}
          currentDay={currentDay}
          dayIndex={i}
          day={d}
          weekState={weekState}
          setWeekState={setWeekState}
          laneAssignments={laneAssignments}
        />
      ))}
    </div>
  );
});

const Day = React.memo(
  ({ currentDay, day, dayIndex, laneAssignments, weekState, setWeekState }: DayProps) => {
    const isWeekend = dayIndex === 5 || dayIndex === 6;

    return (
      <div className={classNames("flex flex-col flex-grow relative", dayIndex !== 0 && "border-l")}>
        <span className="flex justify-center items-center border-b h-10 relative font-semibold capitalize text-xs">
          <span className={classNames(isWeekend && "text-gray-400")}>{day}</span>
          {dayIndex + 1 === currentDay && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
              <Pill text="Today" />
            </span>
          )}
        </span>
        {!!laneAssignments.length && (
          <div className="flex justify-evenly mt-3">
            {laneAssignments.map((la, i) => (
              <Lane
                key={`la-${i}`}
                weekState={weekState}
                setWeekState={setWeekState}
                dayIndex={dayIndex}
                laneAssignment={la}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

const Lane = ({
  laneAssignment,
}: {
  weekState: WeekState;
  setWeekState: SetStateAction<WeekState>;
  laneAssignment: AgentLane;
  dayIndex: number;
}) => {
  const { agent } = laneAssignment;
  const title = `${agent.name} (${agent.email})`;

  const laneRef = React.useRef<HTMLDivElement>(null);

  const [selectionState, setSelectionState] = useAtom(selectionStateAtom);

  const emptySelectionState = Object.keys(selectionState).length === 0;

  useClickOutside(laneRef, () => setSelectionState({}), emptySelectionState);

  return (
    <div ref={laneRef} className="flex flex-col justify-end items-center gap-1">
      <div className="flex flex-col gap-1 items-center h-[100px] overflow-y-hidden" title={title}>
        <span
          className="text-xs h-[6rem] max-h-[6rem] truncate rotate-180 cursor-default"
          style={{ writingMode: "vertical-rl" }}
        >
          {agent.name}
        </span>
        <Avatar withTitle={false} url={agent.image_url} name={agent.name} size={24} />
      </div>
      <div className="mt-2" />
    </div>
  );
};

const LaneAssignment = ({
  agent,
  agents,
  assignAgent,
}: {
  agent?: Agent;
  agents: Agent[];
  assignAgent: (x: Agent | undefined) => void;
}) => {
  const [showOptions, setShowOptions] = React.useState(false);
  const [inputSearchValue, setInputSearchValue] = React.useState<string>();

  const menuRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useClickOutside(menuRef, () => setShowOptions(false), !showOptions);

  React.useEffect(() => {
    if (showOptions) {
      inputRef.current?.focus();
    }
  }, [showOptions]);

  const agentsToShow = React.useMemo(() => {
    const eligible = agents.filter(a => ["owner", "admin", "agent"].includes(a.role));
    const filtered = eligible.filter(
      a => !inputSearchValue || a.name.toLowerCase().includes(inputSearchValue.toLowerCase())
    );

    const filteredAgents = agent ? filtered.filter(a => a.id !== agent.id) : filtered;

    return filteredAgents.map((x, i) => {
      const { name, image_url } = x;
      return {
        id: i,
        displayLabel: name,
        value: x,
        option: <AgentView name={name} size={25} image_url={image_url} />,
      };
    });
  }, [agent, agents, inputSearchValue]);

  return (
    <div ref={menuRef} className="relative">
      <AgentSelector agent={agent} assignAgent={assignAgent} setShowOptions={setShowOptions} />
      {showOptions && (
        <div
          className={classNames(
            "z-20 absolute top-12 rounded-md right-0 max-w-80 py-2 bg-white fog:box-shadow-m"
          )}
        >
          <SelectSearch
            onChange={o => {
              setShowOptions(false);
              assignAgent(o.value);
            }}
            inputSearchValue={inputSearchValue}
            setInputSearchValue={setInputSearchValue}
            options={agentsToShow}
            showOptions={!!agentsToShow.length}
          />
        </div>
      )}
    </div>
  );
};

const Pill = ({ text }: { text: string }) => {
  return (
    <span className="bg-brand-pink-500 font-body font-bold text-xs justify-center text-white inline-flex text-center px-1 py-0 rounded-md">
      {text}
    </span>
  );
};

const AgentSelector = ({
  agent,
  setShowOptions,
  assignAgent,
}: {
  agent: Agent | undefined;
  setShowOptions: SetStateAction<boolean>;
  assignAgent: (agent: Agent | undefined) => void;
}) => {
  return (
    <div
      className="cursor-pointer"
      onClick={() =>
        setShowOptions(x => {
          return !x;
        })
      }
    >
      <div className="w-52 rounded-xl bg-gray-100 h-10 flex items-center px-3">
        {agent ? (
          <div className="w-full flex items-center justify-between gap-1">
            <div className="flex gap-1 fog:text-caption-m items-center truncate">
              <Avatar url={agent.image_url} name={agent.name} size={24} />
              <span>{agent.name}</span>
            </div>
            <button
              onClick={e => {
                assignAgent(undefined);
                e.stopPropagation();
              }}
              className="cursor-pointer text-gray-500 hover:text-brand-red-500"
            >
              <Icons.Trash className="w-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1 items-center">
            <Icons.InvitedUserIcon className="w-6 h-6" />
            <span className="text-xs">Add agent</span>
          </div>
        )}
      </div>
    </div>
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

const AgentView = (props: AgentViewProps) => {
  const { image_url, name, size } = props;
  return (
    <div className="flex items-center gap-x-2 p-2 hover:bg-gray-200 cursor-pointer">
      <Avatar url={image_url} name={name} size={size} />
      <div className="flex items-center truncate gap-x-1">
        <span className="flex-1 truncate">{name}</span>
        <Icons.AgentMark />
      </div>
    </div>
  );
};
