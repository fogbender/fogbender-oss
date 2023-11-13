import classNames from "classnames";
import React from "react";

import { Icons } from "./Icons";
import { ThickButton } from "./lib";
import { useInput } from "./useInput";

export const CreateTagForm: React.FC<{
  initialValue: string | undefined;
  nameOk: (x: string) => boolean;
  onCreate: (name: string) => void;
  creating: boolean;
}> = ({ initialValue, nameOk, onCreate, creating }) => {
  const inputClassName =
    "w-full bg-gray-100 text-gray-800 dark:text-gray-200 dark:placeholder-gray-400 transition focus:outline-none px-3 appearance-none leading-loose text-lg";

  const [newTagName, newTagNameInput] = useInput({
    type: "text",
    className: inputClassName,
    outerDivClassName: "w-full",
    placeholder: "Name",
    autoFocus: true,
    defaultValue: initialValue,
  });

  const newTagOk = React.useMemo(() => {
    if (newTagName.trim().length === 0) {
      return undefined;
    } else {
      return nameOk(newTagName);
    }
  }, [newTagName, nameOk]);

  const formOk = React.useMemo(() => newTagOk === true, [newTagOk]);

  function tagInputSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <form onSubmit={tagInputSubmit}>
      <div className="flex flex-col gap-6">
        <div className="font-admin mb-2 text-4xl font-bold">Create a new tag</div>

        <div
          className={classNames(
            "flex h-14 w-full rounded-lg bg-gray-100 dark:bg-black",
            newTagName.length === 0 ? "flex-row items-center" : "flex-col items-start",
            "border",
            newTagOk === undefined
              ? "border-opacity-0"
              : newTagOk === false
              ? "border-brand-red-100"
              : "border-green-300"
          )}
        >
          {newTagName &&
            (newTagOk === false ? (
              <div className="px-3 text-xs text-red-400">This name is already taken</div>
            ) : (
              <div className="px-3 text-xs text-gray-500">Tag name</div>
            ))}

          <div className="flex w-full content-between">
            {newTagNameInput}
            {newTagOk && (
              <div className="mr-3 flex text-green-500">
                <Icons.Check />
              </div>
            )}
          </div>
        </div>

        <ThickButton disabled={!formOk} onClick={() => onCreate(newTagName)} loading={creating}>
          Create tag
        </ThickButton>
      </div>
    </form>
  );
};
