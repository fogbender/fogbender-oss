import classNames from "classnames";
import React from "react";
import { type Attachment, type Message as MessageT } from "fogbender-proto";
import { useQuery } from "react-query";

import { GalleryElement } from "./GalleryElement";

export const TextGalleryElement = ({
  attachment,
  message,
}: {
  attachment: Attachment;
  message: MessageT;
}) => {
  const stopEvent = React.useCallback((e?: any) => e?.stopPropagation?.(), []);
  const { fileUrl } = attachment;
  const { data } = useQuery({
    queryKey: ["url", fileUrl],
    queryFn: () => {
      return fetch(fileUrl, {
        method: "GET",
      }).then(res => res.text());
    },
  });

  return (
    <GalleryElement attachment={attachment} message={message}>
      {fileUrl && (
        <div
          className="w-[90%] self-center p-10 max-h-full overflow-auto fbr-scrollbar text-sm"
          onClick={stopEvent}
        >
          <div
            className={classNames(
              "text-left whitespace-pre-wrap break-all",
              "text-black dark:text-white",
              "bg-white dark:bg-brand-dark-bg",
              "p-4"
            )}
          >
            {data}
          </div>
        </div>
      )}
    </GalleryElement>
  );
};
