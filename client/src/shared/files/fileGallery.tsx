import classNames from "classnames";
import { atom, useAtom } from "jotai";
import { withImmer } from "jotai/immer";
import React from "react";
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";

import { Icons } from "../components/Icons";
import { useIdle } from "../utils/useIdle";

const showingFileIdAtom = atom<string | undefined>(undefined);
const galleryFilesAtom = withImmer(
  atom<{
    [roomId: string]: {
      [messageId: string]: {
        [elementId: number]: () => React.ReactNode;
      };
    };
  }>({})
);

export function useFileGallery() {
  const [showingFileId, setShowingFileId] = useAtom(showingFileIdAtom);
  const [galleryFiles, setGalleryFiles] = useAtom(galleryFilesAtom);
  return { galleryFiles, setGalleryFiles, showingFileId, setShowingFileId };
}

export function useAddFileToGallery(
  roomId: string | undefined,
  id: string | undefined,
  getElement: () => React.ReactNode
) {
  const elementId = React.useRef(Math.random()).current;
  const { setGalleryFiles, setShowingFileId } = useFileGallery();
  React.useEffect(() => {
    if (!roomId || !id) {
      return;
    }
    setGalleryFiles(x => {
      x[roomId] = x[roomId] || {};
      x[roomId][id] = x[roomId][id] || {};
      x[roomId][id][elementId] = getElement;
    });
    return () => {
      setGalleryFiles(x => {
        delete x[roomId][id][elementId];
        if (!Object.keys(x[roomId][id]).length) {
          delete x[roomId][id];
          if (!Object.keys(x[roomId]).length) {
            delete x[roomId];
          }
        }
      });
    };
  }, [getElement, id, roomId, setGalleryFiles]);
  return { setShowingFileId };
}

export const GalleryModal = () => {
  const isIdle = useIdle(3e3, true);
  const { showingFileId, setShowingFileId, galleryFiles } = useFileGallery();
  const galleryFile = React.useMemo(() => {
    if (showingFileId) {
      for (const roomId in galleryFiles) {
        for (const id in galleryFiles[roomId]) {
          if (id === showingFileId) {
            const ids = Object.keys(galleryFiles[roomId]).sort();
            const index = ids.findIndex(id => id === showingFileId);
            return { roomId, ids, index };
          }
        }
      }
    }
    return;
  }, [galleryFiles, showingFileId]);
  React.useEffect(() => {
    const listen = (e: KeyboardEvent) => {
      // Escape
      if (e.keyCode === 27) {
        setShowingFileId(undefined);
      }
    };
    document.addEventListener("keydown", listen, false);
    return () => document.removeEventListener("keydown", listen, false);
  }, [setShowingFileId]);
  React.useEffect(() => {
    return () => {
      setShowingFileId(undefined);
    };
  }, [setShowingFileId]);
  React.useEffect(() => {
    const element = document.querySelector(".carousel-root");
    if (element instanceof HTMLElement) {
      element.focus();
    }
  }, [galleryFile, showingFileId]);
  const renderArrowButton = React.useCallback(
    (direction: "prev" | "next", clickHandler: () => void, visible: boolean) => {
      return visible ? (
        <div
          onClick={clickHandler}
          className={classNames(
            "max-w-1/4 group absolute top-24 bottom-24 z-10 flex w-24 cursor-pointer items-center [@media(hover:hover)]:w-52",
            direction === "prev"
              ? "left-0 justify-start pl-4 lg:justify-center lg:pl-0"
              : "right-0 justify-end pr-4 lg:justify-center lg:pr-0"
          )}
        >
          <div
            className={classNames(
              "invisible group-hover:visible",
              direction === "prev" && "rotate-180 transform"
            )}
          >
            <IconButton>
              <Icons.ChevronRight className="w-6" />
            </IconButton>
          </div>
        </div>
      ) : undefined;
    },
    []
  );
  if (!showingFileId || !galleryFile) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-10 overflow-y-auto bg-gray-800 bg-opacity-90">
      <Carousel
        showArrows={true}
        showThumbs={false}
        showStatus={false}
        showIndicators={false}
        useKeyboardArrows={true}
        selectedItem={galleryFile.index}
        children={galleryFile.ids.map(id => {
          return (
            <div
              key={id}
              className="flex h-screen flex-col items-center justify-center p-0 pb-28 sm:p-4 sm:pb-28"
              onClick={() => setShowingFileId(undefined)}
            >
              {Object.values(galleryFiles[galleryFile.roomId][id])[0]()}
            </div>
          );
        })}
        renderArrowNext={(clickHandler, hasNext) =>
          renderArrowButton("next", clickHandler, hasNext)
        }
        renderArrowPrev={(clickHandler, hasPrev) =>
          renderArrowButton("prev", clickHandler, hasPrev)
        }
      />
      <div
        className={classNames(
          "absolute top-0 right-0 z-10 cursor-pointer pt-4 pr-4 sm:pt-12 sm:pr-12",
          isIdle && "opacity-0 transition-opacity duration-300"
        )}
        onClick={() => setShowingFileId(undefined)}
      >
        <IconButton>
          <Icons.XClose />
        </IconButton>
      </div>
    </div>
  );
};

const IconButton: React.FC<{}> = ({ children }) => {
  return <div className="fog:box-shadow-m rounded-2xl bg-white p-3">{children}</div>;
};
