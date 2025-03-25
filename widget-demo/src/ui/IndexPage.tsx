/* eslint-disable jsx-a11y/anchor-is-valid */
import classNames from "classnames";
import React from "react";

type ContainerRect = {
  top?: number;
  bottom?: number;
  height?: string;
  left?: number;
  right?: number;
  width?: number;
};

export const IndexPage = ({ children }: { title: string; children: React.ReactNode }) => {
  const frameWidth = 40;

  const [rcontentStyle, setRcontentStyle] = React.useState({});

  const [rtopStyle, setRtopStyle] = React.useState<ContainerRect>({
    top: 100,
    bottom: 100 + frameWidth,
    height: `${frameWidth}px`,
  });

  const [rbottomStyle, setRbottomStyle] = React.useState<ContainerRect>({
    bottom: 100,
    height: `${frameWidth}px`,
  });

  const [rleftStyle, setRleftStyle] = React.useState<ContainerRect>({
    top: 0,
    left: 100,
    height: "100%",
    width: frameWidth,
  });

  const [rrightStyle, setRrightStyle] = React.useState<ContainerRect>({
    top: 0,
    right: 100,
    height: "100%",
    width: frameWidth,
  });

  React.useEffect(() => {
    const rtop = document.getElementById("rtop")?.getBoundingClientRect();
    const rbottom = document.getElementById("rbottom")?.getBoundingClientRect();
    const rleft = document.getElementById("rleft")?.getBoundingClientRect();
    const rright = document.getElementById("rright")?.getBoundingClientRect();

    if (rtop && rbottom && rleft && rright) {
      setRcontentStyle(s => ({
        ...s,
        top: rtop.y + frameWidth,
        height: rbottom.y - frameWidth - rtop.y,
        left: rleft.x + frameWidth,
        width: rright.x - frameWidth - rleft.x,
      }));
    }
  }, [rtopStyle, rbottomStyle, rleftStyle, rrightStyle]);

  React.useEffect(() => {
    const rootEl = document.documentElement;

    let prevWidth = rootEl.clientWidth;
    let prevHeight = rootEl.clientHeight;

    function adaptNewWidth(widthDifference: number) {
      setRrightStyle(prev => ({
        ...prev,
        left: prev.left ? prev.left - widthDifference : prev.left,
      }));
    }

    function adaptNewHeight(heightDifference: number) {
      setRbottomStyle(prev => ({
        ...prev,
        top: prev.top ? prev.top - heightDifference : prev.top,
      }));
    }

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        if (entry.contentRect) {
          const currentWidth = entry.contentRect.width;

          const currentHeight = entry.contentRect.height;

          if (prevWidth !== currentWidth) {
            const widthDifference = prevWidth - entry.contentRect.width;
            adaptNewWidth(widthDifference);
            prevWidth = currentWidth;
          }

          if (prevHeight !== currentHeight) {
            const heightDifference = prevHeight - entry.contentRect.height;
            adaptNewHeight(heightDifference);
            prevHeight = currentHeight;
          }
        }
      }
    });

    resizeObserver.observe(rootEl);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const onRtopDrag = (e: React.DragEvent) => {
    if (e.pageY === 0 && e.pageX === 0) {
      return;
    }
    setRtopStyle(s => ({ ...s, top: e.pageY }));
  };

  const onRbottomDrag = (e: React.DragEvent) => {
    if (e.pageY === 0 && e.pageX === 0) {
      return;
    }
    setRbottomStyle(s => ({ ...s, top: e.pageY - frameWidth }));
  };

  const onRleftDrag = (e: React.DragEvent) => {
    if (e.pageY === 0 && e.pageX === 0) {
      return;
    }
    setRleftStyle(s => ({ ...s, left: e.pageX }));
  };

  const onRrightDrag = (e: React.DragEvent) => {
    if (e.pageY === 0 && e.pageX === 0) {
      return;
    }
    setRrightStyle(s => ({ ...s, left: e.pageX - frameWidth }));
  };

  React.useEffect(() => {
    const dragImgEl = document.createElement("span");
    dragImgEl.setAttribute(
      "style",
      "position: absolute; display: block; top: 0; left: 0; width: 0; height: 0;"
    );
    dragImgEl.setAttribute("id", "empty-image");
    document.body.appendChild(dragImgEl);
  }, []);

  const onDragStart = (e: React.DragEvent) => {
    const emptyImage = document.getElementById("empty-image");
    if (emptyImage) {
      e.dataTransfer.setDragImage(emptyImage, 0, 0);
    }
  };

  return (
    <main
      id="main"
      className={classNames(
        "h-full w-full",
        "bg-teal-50 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
      )}
      onDragOver={e => e.preventDefault()}
    >
      <div id="rcontent" className="absolute flex" style={rcontentStyle}>
        {children}
      </div>

      <div
        id="rtop"
        draggable={true}
        onDrag={onRtopDrag}
        onDragStart={onDragStart}
        className={classNames(
          "bg-transparent border-teal-200 w-full border-b-8 absolute cursor-move",
          "bg-transparent bg-[radial-gradient(#2f95e8_1px,transparent_1px)] [background-size:6px_6px]"
        )}
        style={rtopStyle}
      />

      <div
        id="rbottom"
        draggable={true}
        onDrag={onRbottomDrag}
        onDragStart={onDragStart}
        className={classNames(
          "bg-transparent border-teal-200 w-full border-t-8 absolute cursor-move",
          "bg-transparent bg-[radial-gradient(#2f95e8_1px,transparent_1px)] [background-size:6px_6px]"
        )}
        style={rbottomStyle}
      />

      <div
        id="rleft"
        draggable={true}
        onDrag={onRleftDrag}
        onDragStart={onDragStart}
        className={classNames(
          "bg-transparent border-teal-200 w-full border-r-8 absolute cursor-move flex items-center",
          "bg-transparent bg-[radial-gradient(#2f95e8_1px,transparent_1px)] [background-size:6px_6px]"
        )}
        style={rleftStyle}
      />

      <div
        id="rright"
        draggable={true}
        onDrag={onRrightDrag}
        onDragStart={onDragStart}
        className={classNames(
          "bg-transparent border-teal-200 w-full border-l-8 absolute cursor-move",
          "bg-transparent bg-[radial-gradient(#2f95e8_1px,transparent_1px)] [background-size:6px_6px]"
        )}
        style={rrightStyle}
      />
    </main>
  );
};
