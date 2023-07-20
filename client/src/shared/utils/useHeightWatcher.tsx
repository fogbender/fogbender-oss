import React from "react";

export function useHeightWatcher(ref: React.RefObject<HTMLElement>) {
  const [height, setHeight] = React.useState(0);
  React.useLayoutEffect(() => {
    const newHeight = ref.current?.getBoundingClientRect().height;
    if (newHeight && newHeight !== height) {
      setHeight(newHeight);
    }
  });

  return height;
}
