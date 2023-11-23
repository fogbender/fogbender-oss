import classNames from "classnames";
import React from "react";

import { Icons } from "../components/Icons";

export const NewMessagesBelowIndicator: React.FC<{ id: string; dimmed: boolean }> = ({
  id,
  dimmed,
}) => {
  return (
    <div
      className={classNames(
        "fog:text-caption-m relative z-0 my-1 text-center transition",
        dimmed
          ? "text-gray-500 dark:text-gray-300 delay-1000 duration-1000"
          : "duration-0 delay-0 text-brand-pink-500"
      )}
      key={`${id}-new-messages-below`}
    >
      <span
        className={classNames(
          "relative z-10 inline-flex items-center gap-x-2 bg-white px-4",
          "dark:bg-brand-dark-bg"
        )}
      >
        <span className="scale-75 transform">
          <Icons.ArrowDown />
        </span>
        <span>
          <Icons.ArrowDown />
        </span>
        <span className="scale-125 transform">
          <Icons.ArrowDown />
        </span>
        <span>New messages</span>
        <span className="scale-125 transform">
          <Icons.ArrowDown />
        </span>
        <span>
          <Icons.ArrowDown />
        </span>
        <span className="scale-75 transform">
          <Icons.ArrowDown />
        </span>
      </span>
      <div
        className={classNames(
          "absolute bottom-1/2 -mt-0.5 h-0 w-full border-b transition",
          dimmed
            ? "border-gray-200 delay-1000 duration-1000"
            : "duration-0 delay-0 border-brand-pink-500 border-opacity-30"
        )}
      />
    </div>
  );
};
