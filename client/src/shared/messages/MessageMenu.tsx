import classNames from "classnames";
import React from "react";
import ReactDOM from "react-dom";

import { useAtomValue } from "jotai";
import { modeAtom } from "../store/config.store";

export const MessageMenu = ({
  targetRef,
  menuBarRef,
  children,
}: {
  targetRef?: React.MutableRefObject<HTMLElement | null | undefined>;
  menuBarRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}) => {
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    const targetElement = targetRef?.current;
    const menuBarElement = menuBarRef.current;

    const updatePosition = () => {
      if (menuBarElement) {
        const actionsCount = React.Children.toArray(children).reduce<number>((count, child) => {
          if (React.isValidElement(child) && child.props?.children) {
            const innerElements = React.Children.toArray(child.props.children).filter(nestedChild =>
              React.isValidElement(nestedChild)
            );

            return count + innerElements.length;
          }

          return count;
        }, 0);

        const rect = menuBarElement.getBoundingClientRect();

        const offset = (() => {
          const offset = 30 + 36 * actionsCount;

          if (rect.top < 250) {
            return offset - 145;
          } else {
            return -offset;
          }
        })();

        setPosition({
          top: rect.top + offset,
          left: rect.left - 183,
        });
      }
    };

    updatePosition();

    if (targetElement) {
      targetElement.addEventListener("scroll", updatePosition);
      targetElement.addEventListener("resize", updatePosition);
    }

    return () => {
      if (targetElement) {
        targetElement.removeEventListener("scroll", updatePosition);
        targetElement.removeEventListener("resize", updatePosition);
      }
    };
  }, [targetRef, menuBarRef, children]);

  const themeMode = useAtomValue(modeAtom);

  return ReactDOM.createPortal(
    <div
      className={classNames(themeMode === "dark" && "dark")}
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
};
