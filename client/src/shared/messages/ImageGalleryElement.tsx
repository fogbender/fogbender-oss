import { type Attachment, type Message as MessageT, } from "fogbender-proto";
import React from "react";

import { GalleryElement } from "./GalleryElement";

export const ImageGalleryElement = ({
  attachment,
  message,
}: {
  attachment: Attachment;
  message: MessageT;
}) => {
  const stopEvent = React.useCallback((e?: any) => e?.stopPropagation?.(), []);
  const isImage = attachment.type === "attachment:image";
  const { filename: name, thumbnail, fileUrl, } = attachment;
  return (
    <GalleryElement
      attachment={attachment}
      message={message}
    >
      {isImage && fileUrl ? (
        <div className="flex h-full w-full items-center justify-center">
          <img
            className="max-h-full max-w-full object-scale-down"
            alt={name}
            src={fileUrl}
            style={{
              width: thumbnail?.original_width,
              height: thumbnail?.original_height,
            }}
            onClick={stopEvent}
          />
        </div>
      ) : (
        <div className="mx-auto self-center p-10" onClick={stopEvent}>
          <img className="bg-white py-10" alt={name} src={icon} />
        </div>
      )}
    </GalleryElement>
  );
};

const icon =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="512" width="466" viewBox="0 0 512 512"><path d="M450.354 86.668s-1.397-2-64.997-74.668v74.668h64.997z"/><path d="M439.833 95.963v10.481h.041v372.3c0 7.326-5.96 13.286-13.287 13.286H117.768c-7.327 0-13.287-5.96-13.287-13.286V35.768c0-7.327 5.96-13.287 13.287-13.287h248.074v.019h10.48V12H117.768C104.695 12 94 22.695 94 35.768v442.976c0 13.071 10.695 23.768 23.768 23.768h308.819c13.072 0 23.768-10.696 23.768-23.768V95.963h-10.522z"/><path d="M81 81v82h219.667V81H81zm68.56 22.432h-27.263v13.343h23.533v9.536h-23.533v23.956h-11.382V93.896h38.645v9.536zm20.418 46.835h-11.382V93.896h11.382v56.371zm50.834 0h-39.683V94.358h11.382v46.411h28.301v9.498zm50.987 0h-42.874V93.896h41.798v9.536h-30.416v12.497h28.301v9.498h-28.301v15.342h31.492v9.498z"/></svg>';

