import classNames from "classnames";

import { Chevron } from "../components/Icons";

export const ChevronButton = ({
  isLarge,
  disabled,
  isOpen,
}: {
  isLarge?: boolean;
  disabled?: boolean;
  isOpen?: boolean;
}) => {
  return (
    <div
      className={classNames(
        "flex transform items-center justify-center rounded-full bg-gray-200 text-black transition hover:bg-gray-300",
        isLarge ? "h-8 w-8" : "h-5 w-5",
        disabled && "hidden",
        isOpen ? "rotate-180" : "rotate-0"
      )}
    >
      <Chevron className={isLarge ? "w-5" : "w-3"} />
    </div>
  );
};
