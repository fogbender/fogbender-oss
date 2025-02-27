import classNames from "classnames";
import React from "react";
import ReactDOM from "react-dom";

import { useAtomValue } from "jotai";
import { modeAtom } from "../store/config.store";

export const UserInfoCardReveal = ({
  show,
  messageRef,
  scrollableRef,
  children,
}: {
  show: boolean;
  messageRef: React.RefObject<HTMLDivElement>;
  scrollableRef?: React.MutableRefObject<HTMLElement | null | undefined>;
  children?: React.ReactNode;
}) => {
  const [mounted, setMounted] = React.useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useLayoutEffect(() => {
    const t = setTimeout(() => setVisible(show), 50);
    return () => {
      clearTimeout(t);
    };
  }, [show]);

  const themeMode = useAtomValue(modeAtom);

  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    const scrollableElement = scrollableRef?.current;
    const messageElement = messageRef.current;

    const updatePosition = () => {
      if (messageElement && scrollableElement) {
        const rect = messageElement.getBoundingClientRect();

        setPosition({
          top: rect.top - 100,
          left: rect.left + 45,
        });
      }
    };

    updatePosition();

    if (scrollableElement) {
      scrollableElement.addEventListener("scroll", updatePosition);
      scrollableElement.addEventListener("resize", updatePosition);
    }

    return () => {
      if (scrollableElement) {
        scrollableElement.removeEventListener("scroll", updatePosition);
        scrollableElement.removeEventListener("resize", updatePosition);
      }
    };
  }, [scrollableRef, messageRef, children]);

  if (show || mounted) {
    return ReactDOM.createPortal(
      <div
        ref={setMounted}
        className={classNames(
          "transition delay-0 duration-300 max-w-min",
          visible ? "opacity-100" : "opacity-0 pointer-events-none",
          themeMode === "dark" && "dark"
        )}
        style={{
          position: "absolute",
          top: `${position.top}px`,
          left: `${position.left}px`,
          zIndex: 9999,
        }}
      >
        {children}
      </div>,
      document.body
    );
  }
  return null;
};
