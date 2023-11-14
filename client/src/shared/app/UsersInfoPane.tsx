import classNames from "classnames";
import { type Room } from "fogbender-proto";
import React from "react";

import { type RenderUsersInfoCb } from "./UsersInfo";

export const UsersInfoPane: React.FC<{
  room: Room | undefined;
  renderUsersInfoPane?: RenderUsersInfoCb;
}> = ({ room, renderUsersInfoPane }) => {
  return (
    <div
      className={classNames(
        "relative flex h-full flex-col justify-end overflow-hidden bg-white dark:bg-black focus:outline-none",
        "sm:border-l sm:px-2"
      )}
    >
      <div
        className={classNames(
          "fbr-scrollbar flex flex-1 flex-col justify-start gap-2 overflow-auto overflow-x-hidden text-black"
        )}
      >
        {room &&
          renderUsersInfoPane?.({
            room,
          })}
      </div>
    </div>
  );
};
