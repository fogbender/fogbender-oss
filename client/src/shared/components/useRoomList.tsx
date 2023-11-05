import classNames from "classnames";
import { type Room as RoomT } from "fogbender-proto";
import React from "react";

import { formatCustomerName, isInternalHelpdesk } from "../utils/format";

import { Icons } from "./Icons";
import { Avatar } from "./lib";

export type AutocompleteItem =
  | { kind: "room"; id: string; room: RoomT }
  | { kind: "command"; id: string; command: string; room: RoomT };

export const useRoomList = ({
  autocompleteItems,
  userId,
  onItemClick,
  selectedItems,
  selectedStyle,
}: {
  autocompleteItems: AutocompleteItem[];
  userId: string | undefined;
  onItemClick: (item: AutocompleteItem) => void;
  selectedItems?: { [itemId: string]: boolean };
  selectedStyle?: string;
}) => {
  const isAgent = userId?.startsWith("a");
  const name = (room: RoomT, text?: string) => {
    if (room.type === "dialog" && room.counterpart) {
      const { imageUrl, name, type } = room.counterpart;

      return (
        <span className=" col-start-1 col-end-3 flex items-center fog:text-chat-username-m truncate">
          <span className="pr-2">
            <Avatar url={imageUrl} name={name} size={25} />
          </span>
          <span className="flex truncate">
            {text ? (
              <span className="flex-1 truncate">{text}</span>
            ) : (
              <>
                <span className="flex-1 truncate">{name}</span>
                {type === "agent" && (
                  <span className="flex ml-1 text-gray-500">
                    <Icons.AgentMark />
                  </span>
                )}
              </>
            )}
          </span>
        </span>
      );
    } else {
      return (
        <span className="col-start-1 col-end-3 fog:text-chat-username-m truncate" title={room.name}>
          {room.name}
        </span>
      );
    }
  };

  return (
    <React.Fragment>
      {autocompleteItems.map(item => {
        const x = item.kind === "room" ? item.room : item.room;
        return (
          <div
            key={item.id}
            className={classNames(
              "grid grid-cols-3 items-center p-2 cursor-pointer",
              (selectedItems && selectedItems[item.id] && selectedStyle === undefined
                ? "bg-blue-100"
                : selectedStyle) || "hover:bg-gray-100"
            )}
            onClick={() => onItemClick(item)}
          >
            {selectedItems && selectedItems[item.id] && <ScrollIntoView />}
            {item.kind === "room" ? name(x) : name(x, `⤷ ${item.command}`)}
            {item.kind === "room" && isAgent && (
              <span
                className={classNames(
                  "col-start-3 col-end-4 ml-2 truncate fog:text-body-s",
                  isInternalHelpdesk(x.customerName) && "text-green-500",
                  x.customerName === "It’s you!" &&
                    "self-center text-white justify-self-start text-xs bg-green-500 rounded-lg py-0.5 px-1 text-center"
                )}
                style={{ minWidth: "12ch" }}
              >
                {formatCustomerName(x.customerName)}
              </span>
            )}
          </div>
        );
      })}
    </React.Fragment>
  );
};

const ScrollIntoView = () => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  return <div ref={ref} />;
};
