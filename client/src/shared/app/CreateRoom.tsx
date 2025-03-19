import { Listbox } from "@headlessui/react";
import classNames from "classnames";
import dayjs from "dayjs";
import { type SearchCustomers, useRosterActions, useWs } from "fogbender-proto";
import React from "react";
import { useQuery } from "@tanstack/react-query";

import { Icons } from "../components/Icons";
import { CustomerAvatar, FilterInput, ThickButton } from "../components/lib";
import { useInputWithError } from "../components/useInputWithError";
import { Select } from "../ui/Select";
import { queryKeys } from "../utils/client";
import { formatCustomerName, isExternalHelpdesk, isInternalHelpdesk } from "../utils/format";

const tableHeaders = [
  { name: "Name", colSpan: 4 },
  { name: "Created", colSpan: 3 },
  { name: "Last activity", colSpan: 3 },
  { name: <Icons.User className="w-3.5 h-3.5" />, colSpan: 2 },
];

export const CreateRoom: React.FC<{
  userId: string | undefined;
  isAgent: boolean | undefined;
  workspaceId: string | undefined;
  helpdeskId?: string | undefined;
  onCreate: (id: string) => void;
  initialValue: string | undefined;
  customerName: string | undefined;
}> = ({ userId, isAgent, workspaceId, helpdeskId, onCreate, initialValue, customerName }) => {
  const { createRoom } = useRosterActions({
    workspaceId,
  });
  const { serverCall } = useWs();

  const [searchInputValue, setSearchInputValue] = React.useState<string>();

  const { data: internalCustomerData } = useQuery({
    queryKey: queryKeys.internalCustomers(workspaceId),
    queryFn: async () => {
      if (userId && workspaceId) {
        const res = await serverCall<SearchCustomers>({
          msgType: "Search.Customers",
          term: "$Cust_Internal",
          limit: 1,
          workspaceId,
        });
        if (res.msgType === "Search.Ok" && res.items.length > 0) {
          return res.items[0];
        }
      }
      return;
    },
    enabled: !!workspaceId,
    staleTime: Infinity,
  });

  const { data: customers } = useQuery({
    queryKey: ["searchCustomers", searchInputValue],
    queryFn: async () => {
      if (userId && workspaceId) {
        const res = await serverCall({
          msgType: "Search.Customers",
          term: searchInputValue || "",
          workspaceId,
        });
        if (res.msgType === "Search.Ok") {
          return res.items;
        }
      }
      return;
    },
    placeholderData: prev => prev,
  });

  const options = React.useMemo(() => {
    const filteredCustomers = (customers || []).filter(
      ({ name }) => !isExternalHelpdesk(name) && (!isInternalHelpdesk(name) || searchInputValue)
    );
    if (internalCustomerData && !searchInputValue) {
      filteredCustomers.unshift(internalCustomerData);
    }
    return filteredCustomers.map(x => {
      return {
        customer: x,
        id: x.id,
        option: (
          <>
            <td className="py-2" colSpan={tableHeaders[0].colSpan}>
              <span className="flex items-center gap-x-3">
                <span>
                  <CustomerAvatar name={x.name} />
                </span>
                <span className="flex-1 truncate">{formatCustomerName(x.name)}</span>
              </span>
            </td>
            <td className="py-2" colSpan={tableHeaders[1].colSpan}>
              <span>{dayjs(x.createdTs / 1000).format("MM.DD.YYYY")}</span>
            </td>
            <td className="py-2" colSpan={tableHeaders[2].colSpan}>
              <span>{x.lastMessageAt && dayjs(x.lastMessageAt / 1000).fromNow(true)}</span>
            </td>
            <td className="py-2" colSpan={tableHeaders[3].colSpan}>
              <span>{x.usersCount}</span>
            </td>
          </>
        ),
        optionTitle: formatCustomerName(x.name),
      };
    });
  }, [customers, internalCustomerData, searchInputValue]);

  const [selectedOption, setSelectedOption] = React.useState<NonNullable<typeof options>[number]>();

  React.useEffect(() => {
    if (selectedOption === undefined && options.length > 0) {
      setSelectedOption(options[0]);
    }
  }, [options, selectedOption]);

  const selectedCustomer = selectedOption?.customer;

  const [roomNameError, setRoomNameError] = React.useState<string>();

  const [roomName, roomNameInput, , , , focusRoomNameInput] = useInputWithError({
    title: "Room name",
    error: roomNameError,
    defaultValue: initialValue,
  });

  React.useEffect(() => {
    setRoomNameError(undefined);
  }, [roomName, selectedCustomer]);

  const [roomType, setRoomType] = React.useState<"public" | "private">("public");

  const onCreateRoom = React.useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      e?.preventDefault();

      const hId = helpdeskId || selectedCustomer?.helpdeskId;

      if (!roomName || !hId) {
        return;
      }

      createRoom({
        name: roomName,
        helpdeskId: hId,
        type: roomType,
        members: roomType === "private" ? [] : undefined,
      }).then(x => {
        if ("error" in x && x.code === 409) {
          setRoomNameError("Room name already taken");
        }
        if (x.msgType !== "Room.Ok") {
          throw x;
        }
        onCreate(x.roomId);
      });
    },
    [createRoom, roomName, helpdeskId, selectedCustomer, roomType, onCreate]
  );

  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <form onSubmit={onCreateRoom}>
      <div className="font-bold font-admin text-4xl mb-8">New room</div>
      {isAgent && selectedOption && (
        <div className="mb-6">
          <Select
            options={options}
            selectedOption={selectedOption}
            title="Customer"
            variant="large"
            onChange={option => {
              setSelectedOption(option);
              focusRoomNameInput();
            }}
            onOptionsFocus={() => {
              inputRef.current?.focus();
            }}
          >
            <div className="p-4 dark:bg-black">
              <div className="bg-gray-100 dark:bg-brand-dark-bg px-4 rounded-lg r">
                <FilterInput
                  noBorder={true}
                  ref={inputRef}
                  clearInputIconPosition="trail"
                  value={searchInputValue}
                  placeholder="Search by customer name"
                  setValue={val => setSearchInputValue(val)}
                />
              </div>
            </div>
            <table className="border-collapse table-auto w-full dark:bg-black">
              <thead>
                <tr
                  style={{ borderBottomWidth: "8px" }}
                  className="border-transparent text-xs text-left"
                >
                  {tableHeaders.map((header, index) => (
                    <th
                      key={index}
                      colSpan={header.colSpan}
                      className={classNames("font-normal", { "pl-10": index === 0 })}
                    >
                      {header.name}
                    </th>
                  ))}
                </tr>
                <tr>
                  <td colSpan={12}>
                    <hr />
                  </td>
                </tr>
              </thead>
              <tbody>
                {options.map(v => {
                  return (
                    <Listbox.Option
                      key={v.id}
                      style={{
                        borderWidth: "8px 16px",
                      }}
                      className={classNames(
                        'border-transparent cursor-pointer focus:bg-gray-100 data-[headlessui-state~="active"]:bg-gray-100 data-[headlessui-state~="selected"]:bg-gray-100 hover:bg-gray-100 font-normal text-left',
                        'dark:focus:bg-gray-600 dark:data-[headlessui-state~="active"]:bg-gray-600 dark:data-[headlessui-state~="selected"]:bg-gray-600 dark:hover:bg-gray-600'
                      )}
                      as="tr"
                      value={v}
                    >
                      {v.option}
                    </Listbox.Option>
                  );
                })}
              </tbody>
            </table>
          </Select>
        </div>
      )}

      <div className="mb-6">{roomNameInput}</div>

      {(selectedCustomer || (helpdeskId && customerName)) && roomName && (
        <div className="mb-6 flex flex-col gap-y-4">
          <div className="flex gap-3 cursor-pointer" onClick={() => setRoomType("public")}>
            <div className="text-blue-500">
              {roomType === "public" ? <Icons.RadioFull /> : <Icons.RadioEmpty />}
            </div>
            <div className="flex-1">
              <b className="font-semibold">Public room</b>
              <div className="text-xs">
                All members of {formatCustomerName(selectedCustomer?.name || customerName)} can
                participate
              </div>
            </div>
          </div>
          {isAgent && (
            <div
              className={classNames(["flex gap-3", isAgent && "cursor-pointer"])}
              onClick={() => {
                isAgent && setRoomType("private");
              }}
            >
              <div className="text-blue-500">
                {roomType === "private" ? (
                  <Icons.RadioFull />
                ) : (
                  <Icons.RadioEmpty disabled={!isAgent} />
                )}
              </div>
              <div>
                <b className="font-semibold">Private room</b>
                <div className="text-xs">
                  Only invited members of {formatCustomerName(selectedCustomer?.name || "")} can
                  participate
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {(selectedOption || helpdeskId) && roomName && (
        <div>
          <ThickButton onClick={onCreateRoom}>Create room</ThickButton>
        </div>
      )}
    </form>
  );
};
