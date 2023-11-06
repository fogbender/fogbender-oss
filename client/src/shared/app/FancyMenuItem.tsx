import classNames from "classnames";
import React from "react";

export const FancyMenuItem = ({
  onClick,
  text,
  icon,
  className,
}: {
  onClick: () => void;
  text: string;
  icon: React.ReactNode;
  className?: string;
}) => {
  return (
    <li className={classNames("p-2 block text-gray-900 hover:text-brand-red-500", className)}>
      <button className="flex w-full text-left gap-4 px-2 items-center" onClick={onClick}>
        <span className="whitespace-nowrap grow">{text}</span>
        {icon}
      </button>
    </li>
  );
};
