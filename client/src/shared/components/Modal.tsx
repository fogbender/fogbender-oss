import { DialogContent, DialogOverlay } from "@reach/dialog";
import classNames from "classnames";
import { useAtomValue } from "jotai";
import React from "react";

import { modeAtom } from "../store/config.store";

import { Icons } from "./Icons";

export const Modal: React.FC<{
  restricted?: boolean;
  skipOverlayClick?: boolean;
  inUserWidget?: boolean;
  onClose: () => void;
}> = ({ restricted = true, skipOverlayClick = false, inUserWidget, onClose, children }) => {
  const mode = useAtomValue(modeAtom);

  return (
    <DialogOverlay
      isOpen={true}
      onDismiss={skipOverlayClick ? undefined : onClose}
      dangerouslyBypassFocusLock={inUserWidget ? true : false}
    >
      {/* FIXME add ariaLabel prop to Modal component and use it here */}
      <DialogContent aria-label="Modal window content">
        <div
          className={classNames(
            "fbr-scrollbar fixed -inset-y-1 -inset-x-3 sm:inset-0 z-10 overflow-auto bg-black bg-opacity-20 p-1 sm:p-4",
            mode === "dark" && "dark"
          )}
          onClick={skipOverlayClick ? undefined : onClose}
        >
          <div className="flex min-h-full h-full sm:h-auto w-full items-start justify-center">
            <div
              className={classNames(
                "sm:fog:box-shadow relative z-40 flex sm:rounded-2xl bg-white h-full sm:h-auto",
                "dark:bg-gray-800 dark:text-white",
                restricted
                  ? "min-w-full sm:min-w-0"
                  : "sm:min-w-0 sm:max-w-1/2 min-w-full max-w-full"
              )}
              style={{ width: restricted ? "720px" : undefined, maxWidth: "calc(100% - 6rem)" }}
            >
              <div
                className="max-h-full max-w-full flex-1 px-8 pt-4 pb-8"
                onClick={e => e.stopPropagation()}
              >
                {children}
              </div>
              <div className="sticky top-0 right-0 h-full w-0" onClick={onClose}>
                <div
                  className={classNames(
                    "absolute top-0 right-2 flex cursor-pointer items-center justify-center rounded-2xl bg-white p-3 text-black shadow-xl hover:text-red-500 sm:top-0 sm:-right-16",
                    "dark:bg-gray-700 dark:text-white dark:hover:text-brand-red-500"
                  )}
                >
                  <Icons.XClose />
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </DialogOverlay>
  );
};
