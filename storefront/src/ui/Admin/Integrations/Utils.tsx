import { Avatar, Icons, type Integration } from "fogbender-client/src/shared";
import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import React from "react";
import { type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { FontAwesomeCheck } from "../../../shared/font-awesome/Check";

export const InputClassName =
  "w-full bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 dark:placeholder-gray-400 transition border focus:outline-none focus:border-gray-700 rounded py-1 px-2 appearance-none leading-normal";

export function operationStatus<DataIn>(
  operation: string | JSX.Element,
  done: boolean,
  res: { data: DataIn | null; error: Error | null; loading: boolean },
  progressElem: JSX.Element | null
) {
  return (
    <div className="flex justify-between">
      {progressElem && <span className="whitespace-nowrap mr-1">{operation}</span>}
      <span className="ml-1">
        {done && res.error === null && <span className="font-bold text-green-500">OK</span>}
        {done && res.error !== null && <span className="font-bold text-red-500">ERROR</span>}
        {progressElem && !done && <Icons.Spinner className="w-4 text-blue-500" />}
      </span>
    </div>
  );
}

export function operationStatusMutation0<T>(
  operation: string | JSX.Element,
  mutation: UseMutationResult<Response, unknown, T, unknown>
) {
  const { isPending, isSuccess, isError } = mutation;
  return (
    <div className="flex justify-between">
      {(isPending || isSuccess || isError) && (
        <span className="whitespace-nowrap mr-1">{operation}</span>
      )}
      <span className="ml-1">
        {isSuccess && <span className="font-bold text-green-500">OK</span>}
        {isError && <span className="font-bold text-red-500">ERROR</span>}
        {isPending && <Icons.Spinner className="w-4 text-blue-500" />}
      </span>
    </div>
  );
}

export function operationStatusMutation<T>(
  operation: string | JSX.Element,
  done: boolean,
  mutation: UseMutationResult<Response, unknown, T, unknown>,
  progressElem: JSX.Element | null
) {
  return (
    <div className="flex justify-between">
      {progressElem && <span className="whitespace-nowrap mr-1">{operation}</span>}
      <span className="ml-1">
        {done && mutation.error === null && <span className="font-bold text-green-500">OK</span>}
        {done && mutation?.data?.ok !== true && (
          <span className="font-bold text-red-500">ERROR</span>
        )}
        {progressElem && !done && <Icons.Spinner className="w-4 text-blue-500" />}
      </span>
    </div>
  );
}

export function operationStatusQuery<T>(operation: string | JSX.Element, query: UseQueryResult<T>) {
  const { isLoading, error, isFetchedAfterMount } = query;

  return isFetchedAfterMount || isLoading ? (
    <div className="flex justify-between">
      <span className="whitespace-nowrap mr-1">{operation}</span>
      <span className="ml-1">
        {!isLoading && error === null && isFetchedAfterMount && (
          <span className="font-bold text-green-500">OK</span>
        )}
        {error !== null && isFetchedAfterMount && (
          <span className="flex gap-1">
            <span className="font-bold text-red-500">ERROR</span>
          </span>
        )}
        {isLoading && !isFetchedAfterMount && <Icons.Spinner className="w-4 text-blue-500" />}
      </span>
    </div>
  ) : null;
}

export function useProgress(processing: boolean, clearDone: number, maxProgress = 200) {
  const [progress, setProgress] = React.useState<number>();
  const intervalIdRef = React.useRef<number | null>(null);

  const progressTick = React.useCallback(() => {
    setProgress(x => {
      if (x === maxProgress) {
        intervalIdRef.current && window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;

        return x;
      }

      return (x !== undefined && x + 1) || 0;
    });
  }, [maxProgress]);

  React.useEffect(() => {
    if (processing) {
      if (!intervalIdRef.current) {
        setProgress(() => {
          return undefined;
        });
        intervalIdRef.current = window.setInterval(progressTick, 5);
      }
    }
  }, [progressTick, processing]);

  React.useEffect(() => {
    setProgress(undefined);
  }, [clearDone]);

  const progressElem = progress ? (
    <>
      <Icons.Spinner className="text-blue-500" />
      <span className="hidden truncate flex-1 overflow-clip">
        {processing !== undefined &&
          progress !== undefined &&
          Array.from(Array(progress).keys()).map(i => (
            <span key={i} className="mx-px text-xl font-bold">
              .
            </span>
          ))}
      </span>
    </>
  ) : null;

  return {
    progressElem,
    progressDone: progress === maxProgress,
    inProgress: !!progress && progress < maxProgress,
  } as const;
}

export function clipboard<T>(
  text: string,
  setClipboardSignal: (s: T) => void,
  clipboardSignal: undefined | T,
  key: keyof T
) {
  return (
    <ClipboardCopy
      text={text}
      onCopy={() => {
        setClipboardSignal({} as T);
        window.setTimeout(() => setClipboardSignal({ [key]: true } as unknown as T), 100);
      }}
    >
      <div className="ml-1 w-12 -mr-5 flex items-center">
        <Icons.Clipboard />
        {clipboardSignal && clipboardSignal[key] && (
          <FontAwesomeCheck className="ml-1 text-green-500" />
        )}
      </div>
    </ClipboardCopy>
  );
}

export function readOnlyItem(name: string, value: string | JSX.Element) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center">{name}</div>
      <div className="truncate">{value}</div>
    </div>
  );
}

export function configCopyItem(name: string, value: string | JSX.Element, copy: JSX.Element) {
  return (
    <div className="col-span-3 grid gap-2 grid-cols-3">
      <div className="col-span-1 flex items-center">{name}</div>
      <div className="col-span-2 flex">
        <code className="p-2 text-sm flex-1 border-2 border-gray-200 rounded bg-gray-200 dark:text-black truncate">
          {value}
        </code>
        <div className="flex items-center">{copy}</div>
      </div>
    </div>
  );
}

export function configInputItem(name: string, input: JSX.Element) {
  return (
    <div className="col-span-3 grid gap-2 grid-cols-3">
      <div className="col-span-1 flex items-center">{name}</div>
      <div className="col-span-2">{input}</div>
    </div>
  );
}

export function configListItem(
  name: string,
  items: string[],
  value: string | undefined,
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
) {
  return (
    <div className="col-span-3 grid gap-2 grid-cols-3">
      <div className="col-span-1">{name}</div>
      <div className="col-span-2">
        <select className={InputClassName} value={value} onChange={onChange}>
          {items.map((name, i) => (
            <option key={`${name}-${i}`} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function error(text: string | JSX.Element) {
  return <div className="my-4 p-2 rounded bg-red-200 dark:text-black">{text}</div>;
}

export const IntegrationUser: React.FC<{
  userInfo: Integration["userInfo"];
}> = ({ userInfo }) => {
  if (!userInfo) {
    return null;
  }
  return (
    <div className="flex items-center gap-x-2">
      <div className="self-start">
        <Avatar
          url={userInfo.pictureUrl}
          name={userInfo.username}
          size={24}
          bgClassName="bg-red-100"
        />
      </div>
      <div className="flex flex-col gap-y-1 truncate">
        <span className="truncate">{userInfo.username}</span>
        {userInfo.email && (
          <span className="text-gray-500 fog:text-caption-m truncate">{userInfo.email}</span>
        )}
      </div>
    </div>
  );
};
