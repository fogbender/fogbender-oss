import classNames from "classnames";
import { type Attachment, type Message as MessageT, } from "fogbender-proto";
import React from "react";

import { Icons } from "../components/Icons";
import { Avatar } from "../components/lib";
import { useIdle } from "../utils/useIdle";

import { formatTs } from "./times";
import { useFileRefresher } from "./useFileRefresher";

export const GalleryElement = ({
  attachment,
  message,
  children
}: {
  attachment: Attachment;
  message: MessageT;
  children: React.ReactNode;
}) => {
  const now = new Date().getTime();
  const isExpired = attachment.fileExpirationTs / 1000 < now;
  const isIdle = useIdle(3e3, true);
  const stopEvent = React.useCallback((e?: any) => e?.stopPropagation?.(), []);
  const { filename: name, fileUrl, downloadUrl } = attachment;
  const [retryCount, retry] = React.useReducer(x => x + 1, 0);
  useFileRefresher(message.id, retryCount, isExpired);
  return (
    <React.Fragment>
      {children}
      <div
        className={classNames(
          "fog:text-chat-username-m absolute bottom-10 flex w-full flex-col items-center justify-center gap-y-2 text-center text-white ",
          isIdle && !isExpired && "opacity-0 transition-opacity duration-300"
        )}
      >
        <div className="flex max-w-full items-center justify-center gap-x-2 px-4">
          {isExpired ? (
            <span className="text-red-400">
              Failed to update file information, please{" "}
              <button
                className="inline-flex text-red-400 hover:text-red-300"
                onClick={e => {
                  e.stopPropagation();
                  retry();
                }}
              >
                Retry
              </button>
            </span>
          ) : (
            <>
              <span className="truncate">
                <a href={fileUrl} onClick={stopEvent} target="_blank" rel="noopener">
                  {name}
                </a>
              </span>
              <span>
                <a href={downloadUrl} onClick={stopEvent} target="_blank" rel="noopener">
                  <Icons.Download />
                </a>
              </span>
            </>
          )}
        </div>
        {message && (
          <div className="flex flex-wrap items-center justify-center gap-x-2">
            <span>{formatTs(message.createdTs)}, by</span>
            <Avatar url={message.author.avatarUrl} name={message.author.name} size={25} />{" "}
            <span>{message.author.name}</span>
            {message.author.type === "agent" && (
              <span className="text-gray-500">
                <Icons.AgentMark />
              </span>
            )}
          </div>
        )}
      </div>
    </React.Fragment>
  );
};
