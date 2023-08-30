import React from "react";

export const FancyMenuItem = ({
  onClick,
  text,
  icon,
}: {
  onClick: () => void;
  text: string;
  icon: React.ReactNode;
}) => {
  return (
    <li className="p-2 block text-gray-900 hover:text-brand-red-500">
      <button className="flex w-full text-left gap-4 px-2 items-center" onClick={onClick}>
        <span className="whitespace-nowrap grow">{text}</span>
        {icon}
      </button>
    </li>
  );
};
