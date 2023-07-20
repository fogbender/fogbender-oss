import { DialogContent, DialogOverlay } from "@reach/dialog";
import classNames from "classnames";
import React from "react";

import { Icons } from "./Icons";

export const Modal: React.FC<{
  restricted?: boolean;
  skipOverlayClick?: boolean;
  inUserWidget?: boolean;
  onClose: () => void;
}> = ({ restricted = true, skipOverlayClick = false, inUserWidget, onClose, children }) => {
  return (
    <DialogOverlay
      isOpen={true}
      onDismiss={skipOverlayClick ? undefined : onClose}
      dangerouslyBypassFocusLock={inUserWidget ? true : false}
    >
      {/* FIXME add ariaLabel prop to Modal component and use it here */}
      <DialogContent aria-label="Modal window content">
        <div
          className="fbr-scrollbar fixed inset-0 z-10 overflow-auto bg-black bg-opacity-20 p-4"
          onClick={skipOverlayClick ? undefined : onClose}
        >
          <div className="flex min-h-full w-full items-start justify-center">
            <div
              className={classNames(
                "fog:box-shadow-m relative z-40 flex rounded-2xl bg-white",
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
                <div className="absolute -top-4 -right-4 flex cursor-pointer items-center justify-center rounded-2xl bg-white p-3 text-black shadow-xl hover:text-red-500 sm:top-0 sm:-right-16">
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
