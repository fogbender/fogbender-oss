import React from "react";

export const useClickOutside = (
  ref: React.MutableRefObject<HTMLElement | null | undefined>,
  onClick: () => void,
  disable = false,
  exceptModals = false,
  stopPropagation = false
) => {
  React.useEffect(() => {
    const clickListener = (e: any) => {
      if (!ref.current || !ref.current.contains(e.target)) {
        if (exceptModals === false || e?.target?.matches?.("#root *")) {
          setTimeout(onClick, 0);
          if (stopPropagation) {
            e?.stopPropagation();
          }
        }
      }
    };
    const escListener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTimeout(onClick, 0);
      }
    };
    if (!disable) {
      document.addEventListener("click", clickListener, true);
      document.addEventListener("keydown", escListener, true);
    }
    return () => {
      document.removeEventListener("click", clickListener, true);
      document.removeEventListener("keydown", escListener, true);
    };
  }, [ref, onClick, disable]);
};
