import classNames from "classnames";
import React from "react";

export const NoActivityIndicator: React.FC<{
  id: string;
  duration?: string;
  isLast?: boolean;
  hidden?: boolean;
}> = ({ id, duration, isLast, hidden }) => {
  return (
    <div
      className={classNames(
        "fog:text-body-s my-1 text-center text-gray-500",
        isLast && "mb-4",
        hidden && "pointer-events-none invisible"
      )}
      key={`${id}-no-activity`}
    >
      {duration ? <>no messages for {duration}</> : "."}
    </div>
  );
};
