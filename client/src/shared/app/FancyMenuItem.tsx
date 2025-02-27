import classNames from "classnames";
import type React from "react";

export const FancyMenuItem = ({
  onClick,
  text,
  icon,
  className,
}: {
  onClick: (e?: React.MouseEvent) => void;
  text: string;
  icon: React.ReactNode;
  className?: string;
}) => {
  return (
    <li
      className={classNames(
        "group p-2 block text-gray-900 dark:text-white hover:text-brand-red-500 dark:hover:text-brand-red-500",
        className
      )}
    >
      <button className="flex w-full text-left gap-4 px-2 items-center" onClick={e => onClick(e)}>
        <span className="whitespace-nowrap grow">{text}</span>
        {icon}
      </button>
    </li>
  );
};
