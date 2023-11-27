import { type Author, useAuthorEmail } from "fogbender-proto";
import React from "react";

import { ClipboardCopy } from "../components/ClipboardCopy";

import { Icons } from "./Icons";
import { Avatar, BalloonTip, ThinButton } from "./lib";

export const UserInfoCard: React.FC<{
  author: Author;
  onOpenClick?: () => void;
}> = ({ author, onOpenClick }) => {
  const authorEmail = useAuthorEmail(author);
  return (
    <div>
      <div className="flex rounded-lg shadow-lg truncate gap-x-4 p-3 bg-white dark:bg-black max-w-min">
        <div className="truncate flex flex-col">
          <div className="flex items-center truncate fog:text-chat-username-m my-0.5">
            <span className="truncate">{author.name}</span>
            {author.type === "agent" && (
              <span className="px-1 text-gray-500">
                <Icons.AgentMark />
              </span>
            )}
          </div>
          {authorEmail && (
            <span className="flex items-center gap-1">
              <a href={`mailto:${authorEmail}`} target="_blank">
                <div className="truncate fog:text-body-m my-0.5">{authorEmail}</div>
              </a>
              <ClipboardCopy text={authorEmail}>
                <Icons.Clipboard />
              </ClipboardCopy>
            </span>
          )}
          {onOpenClick && (
            <div className="fog:text-caption-s my-0.5 flex items-center">
              <ThinButton small={true} onClick={onOpenClick}>
                Open 1-1
              </ThinButton>
            </div>
          )}
        </div>
        <div className="self-center">
          <Avatar url={author.avatarUrl} name={author.name} size={80} />
        </div>
      </div>
      <span className="text-white dark:text-black">
        <BalloonTip />
      </span>
    </div>
  );
};
