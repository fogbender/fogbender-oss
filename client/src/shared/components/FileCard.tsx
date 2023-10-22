import classNames from "classnames";
import React from "react";

import { Icons } from "./Icons";

// A card representing an uploaded image or other file.
export const FileCard: React.FC<{
  className?: string;
  loading?: boolean;
  onTrash?: React.MouseEventHandler;
  error?: React.ReactNode;
  children?: React.ReactNode;
  title?: string;
}> = ({ children, className, loading, onTrash, error, title }) => {
  return (
    <div
      className={classNames(
        "fog:box-shadow-s fog:text-caption-m relative rounded border border-white bg-white",
        "dark:border-gray-400 dark:bg-gray-900",
        className
      )}
      title={title}
      style={{ minWidth: 100 }}
    >
      {children}
      <div
        className={classNames(
          "fog:box-shadow-s group absolute -right-1 -top-1 bg-white",
          error || onTrash ? "text-red-500" : "text-blue-500",
          onTrash ? "cursor-pointer p-1 hover:bg-gray-100" : "p-1.5", // trash icon needs extra space; spinner needs to be squished
          error
            ? // if error message is present, leave room for text
              "flex flex-row items-start gap-x-1 rounded-lg text-left"
            : // if error message is absent, just show a centered icon, and be sure not to truncate it
              "flex h-6 w-6 flex-row items-center overflow-visible rounded-full text-center",
          loading || onTrash || error ? "" : "hidden"
        )}
        onClick={onTrash}
      >
        {error}
        {onTrash && (
          <div className={classNames(loading && "hidden group-hover:block")}>
            <Icons.Trash className="w-4" />
          </div>
        )}
        {loading && !error && (
          <Icons.SpinnerSmall className="w-4 text-blue-500 group-hover:hidden" />
        )}
      </div>
    </div>
  );
};
