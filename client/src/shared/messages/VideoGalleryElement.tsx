import React from "react";
import { type Attachment, type Message as MessageT } from "fogbender-proto";
import ReactPlayer from "react-player";

import { GalleryElement } from "./GalleryElement";

export const VideoGalleryElement = ({
  attachment,
  message,
}: {
  attachment: Attachment;
  message: MessageT;
}) => {
  const stopEvent = React.useCallback((e?: any) => e?.stopPropagation?.(), []);
  const { fileUrl } = attachment;

  return (
    <GalleryElement attachment={attachment} message={message}>
      {fileUrl && (
        <div
          className="w-[93%] self-center p-10 max-h-full text-sm flex justify-center"
          onClick={stopEvent}
        >
          <ReactPlayer url={fileUrl} controls={true} width="100%" height="100%" />
        </div>
      )}
    </GalleryElement>
  );
};
