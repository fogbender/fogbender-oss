import classNames from "classnames";
import { type Attachment, type Message as MessageT } from "fogbender-proto";
import { atom, type PrimitiveAtom } from "jotai";
import { useAtomValue, useUpdateAtom } from "jotai/utils";
import prettyBytes from "pretty-bytes";
import React from "react";
import { PiFileTextDuotone } from "react-icons/pi";
import { PiFileVideoDuotone } from "react-icons/pi";

import { FileCard } from "../components/FileCard";
import { Icons } from "../components/Icons";
import { useAddFileToGallery } from "../files/fileGallery";

import { useFileRefresher } from "./useFileRefresher";
import { ImageGalleryElement } from "./ImageGalleryElement";
import { TextGalleryElement } from "./TextGalleryElement";
import { VideoGalleryElement } from "./VideoGalleryElement";
import { ImageFileCard } from "./ImageFileCard";

export const MessageFileThumbnail: React.FC<{
  id?: string;
  roomId: string;
  attachment?: Attachment;
  message?: MessageT;
  name: string;
  fileSize?: number;
  thumbnail: Attachment["thumbnail"];
  isImage?: boolean;
  isSingle?: boolean;
  inReply?: boolean;
  inUpload?: boolean;
  fileError?: string;
  loading?: boolean;
  onTrash?: () => void;
  nonInteractive?: boolean;
  inPin?: boolean;
}> = React.memo(
  ({
    id,
    roomId,
    attachment,
    message,
    name,
    fileSize,
    thumbnail,
    isImage,
    isSingle,
    inReply,
    inUpload,
    fileError,
    loading,
    onTrash,
    nonInteractive = false,
    inPin,
  }) => {
    console.log(attachment?.contentType);

    const isPlainText = attachment?.contentType === "text/plain";
    const isVideo = ["video/webm", "video/mp4"].includes(attachment?.contentType ?? "");
    const maxSize = inReply || inUpload ? 80 : inPin ? 26 : isSingle ? 320 : 120;
    const getGalleryElement = React.useCallback(() => {
      if (!attachment || !message) {
        return null;
      }
      if (isPlainText) {
        return <TextGalleryElement attachment={attachment} message={message} />;
      } else if (isVideo) {
        return <VideoGalleryElement attachment={attachment} message={message} />;
      } else {
        return <ImageGalleryElement attachment={attachment} message={message} />;
      }
    }, [attachment, message]);
    const { setShowingFileId } = useAddFileToGallery(
      roomId,
      isImage || isPlainText || isVideo ? id : undefined,
      getGalleryElement
    );
    const nameDotPosition = name.lastIndexOf(".");
    const [fileName, fileExt] =
      nameDotPosition > 0
        ? [name.slice(0, nameDotPosition), name.slice(nameDotPosition)]
        : [name, undefined];
    const playPauseIconCommonClasses = `bg-white hover:text-blue-700 rounded-full text-blue-500 transform ${
      inReply ? "w-8" : "w-14"
    }`;
    return (
      <div>
        {(() => {
          if (isImage && thumbnail?.url) {
            return (
              <ImageFileCard
                name={name}
                fileError={fileError}
                loading={loading}
                onTrash={onTrash}
                setShowingFileId={setShowingFileId}
                attachment={attachment}
                thumbnail={thumbnail}
                nonInteractive={nonInteractive}
                maxSize={maxSize}
                id={id}
                playPauseIconCommonClasses={playPauseIconCommonClasses}
                inReply={inReply}
                inPin={inPin}
                isImage={isImage}
              />
            );
          } else if (isPlainText) {
            return (
              <LinkRefresher attachment={attachment} message={message}>
                {props => (
                  <FileCard
                    className={classNames(
                      "fog:text-link block flex max-w-xs items-center py-1 no-underline",
                      inReply
                        ? "fog:text-caption-s gap-x-1 px-1"
                        : "fog:text-caption-m gap-x-2 px-2"
                    )}
                    title={name}
                    error={fileError ? <div>{fileError}</div> : undefined}
                    loading={loading}
                    onTrash={onTrash}
                  >
                    {!inUpload && !props.isExpired && (
                      <span
                        onClick={() => {
                          setShowingFileId(id);
                        }}
                        className={classNames(inReply && "scale-75 transform")}
                      >
                        <PiFileTextDuotone size={27} />
                      </span>
                    )}
                    {!inUpload && props.isExpired && (
                      <span className={classNames(inReply && "scale-75 transform")}>Retry</span>
                    )}
                    <span
                      onClick={() => {
                        setShowingFileId(id);
                      }}
                      className={classNames("flex-1 truncate", inUpload && "my-1 ml-2 mr-4")}
                    >
                      <span className="flex truncate">
                        <span className="flex-1 truncate text-right">{fileName}</span>
                        <span className="truncate">{fileExt}</span>
                      </span>
                      {!inUpload && fileSize && (
                        <span
                          className={classNames(
                            "block text-gray-500",
                            inReply ? "fog:text-body-xs" : "fog:text-body-s"
                          )}
                          title={fileSize + " bytes"}
                        >
                          <span className="uppercase text-xs">TXT</span> &middot;{" "}
                          {prettyBytes(fileSize)}
                        </span>
                      )}
                    </span>
                  </FileCard>
                )}
              </LinkRefresher>
            );
          } else if (isVideo) {
            return (
              <LinkRefresher attachment={attachment} message={message}>
                {props => (
                  <FileCard
                    className={classNames(
                      "fog:text-link block flex max-w-xs items-center py-1 no-underline",
                      inReply
                        ? "fog:text-caption-s gap-x-1 px-1"
                        : "fog:text-caption-m gap-x-2 px-2"
                    )}
                    title={name}
                    error={fileError ? <div>{fileError}</div> : undefined}
                    loading={loading}
                    onTrash={onTrash}
                  >
                    {!inUpload && !props.isExpired && (
                      <span
                        onClick={() => {
                          setShowingFileId(id);
                        }}
                        className={classNames(inReply && "scale-75 transform")}
                      >
                        <PiFileVideoDuotone size={27} />
                      </span>
                    )}
                    {!inUpload && props.isExpired && (
                      <span className={classNames(inReply && "scale-75 transform")}>Retry</span>
                    )}
                    <span
                      onClick={() => {
                        setShowingFileId(id);
                      }}
                      className={classNames("flex-1 truncate", inUpload && "my-1 ml-2 mr-4")}
                    >
                      <span className="flex truncate">
                        <span className="flex-1 truncate text-right">{fileName}</span>
                        <span className="truncate">{fileExt}</span>
                      </span>
                      {!inUpload && fileSize && (
                        <span
                          className={classNames(
                            "block text-gray-500",
                            inReply ? "fog:text-body-xs" : "fog:text-body-s"
                          )}
                          title={fileSize + " bytes"}
                        >
                          <span className="uppercase text-xs">Video</span> &middot;{" "}
                          {prettyBytes(fileSize)}
                        </span>
                      )}
                    </span>
                  </FileCard>
                )}
              </LinkRefresher>
            );
          } else {
            return (
              <LinkRefresher attachment={attachment} message={message}>
                {props => (
                  <a
                    href={props.linkHref}
                    onClick={e => {
                      if (props.linkOnClick) {
                        props.linkOnClick(e);
                      }
                    }}
                    target="_blank"
                    rel="noopener"
                    className="fog:text-link no-underline"
                  >
                    <FileCard
                      className={classNames(
                        "fog:text-link block flex max-w-xs items-center py-1 no-underline",
                        inReply
                          ? "fog:text-caption-s gap-x-1 px-1"
                          : "fog:text-caption-m gap-x-2 px-2"
                      )}
                      title={name}
                      error={fileError ? <div>{fileError}</div> : undefined}
                      loading={loading}
                      onTrash={onTrash}
                    >
                      {!inUpload && !props.isExpired && (
                        <span className={classNames(inReply && "scale-75 transform")}>
                          <Icons.Download />
                        </span>
                      )}
                      {!inUpload && props.isExpired && (
                        <span className={classNames(inReply && "scale-75 transform")}>Retry</span>
                      )}
                      <span className={classNames("flex-1 truncate", inUpload && "my-1 ml-2 mr-4")}>
                        <span className="flex truncate">
                          <span className="flex-1 truncate text-right">{fileName}</span>
                          <span className="truncate">{fileExt}</span>
                        </span>
                        {!inUpload && fileSize && (
                          <span
                            className={classNames(
                              "block text-gray-500",
                              inReply ? "fog:text-body-xs" : "fog:text-body-s"
                            )}
                            title={fileSize + " bytes"}
                          >
                            {prettyBytes(fileSize)}
                          </span>
                        )}
                      </span>
                    </FileCard>
                  </a>
                )}
              </LinkRefresher>
            );
          }
        })()}
      </div>
    );
  }
);

const LinkRefresher = ({
  children,
  attachment,
  message,
}: {
  attachment?: Attachment;
  message?: MessageT;
  children: (props: {
    linkHref?: string;
    linkOnClick?: React.MouseEventHandler;
    isExpired?: boolean;
  }) => React.ReactNode;
}) => {
  const isExpiredAtom = React.useMemo(() => atom(false), []);
  const isExpired = useAtomValue(isExpiredAtom);
  const [retryCount, retry] = React.useReducer(x => x + 1, 0);
  const linkHref = attachment?.downloadUrl;

  if (!attachment || !message) {
    return <>{children({ linkHref })}</>;
  }

  return (
    <>
      <ExpirationChecker
        messageId={message.id}
        retryCount={retryCount}
        attachment={attachment}
        isExpiredAtom={isExpiredAtom}
      />
      {isExpired
        ? children({ linkHref: isExpired ? undefined : linkHref, linkOnClick: retry, isExpired })
        : children({
            linkHref,
            linkOnClick: e => {
              const now = new Date().getTime();
              const isExpired = attachment.fileExpirationTs
                ? attachment.fileExpirationTs / 1000 < now
                : false;
              if (isExpired) {
                e.preventDefault();
                retry();
              }
            },
          })}
    </>
  );
};

// we need this to avoid conditional hooks
const ExpirationChecker = ({
  messageId,
  retryCount,
  attachment,
  isExpiredAtom,
}: {
  messageId: string;
  retryCount: number;
  attachment: Attachment;
  isExpiredAtom: PrimitiveAtom<boolean>;
}) => {
  const now = new Date().getTime();
  const isExpired = attachment.fileExpirationTs ? attachment.fileExpirationTs / 1000 < now : false;
  const setIsExpiredAtom = useUpdateAtom(isExpiredAtom);
  React.useEffect(() => {
    setIsExpiredAtom(isExpired);
  }, [isExpired, setIsExpiredAtom]);

  return <>{isExpired && <FileRefresher messageId={messageId} retryCount={retryCount} />}</>;
};

const FileRefresher = React.memo(
  ({ messageId, retryCount }: { messageId: string; retryCount: number }) => {
    useFileRefresher(messageId, retryCount, true);

    return null;
  }
);

export const FileGalleryTextElement = ({}: {}) => {
  return (
    <div>
      <span>YO</span>
    </div>
  );
};
