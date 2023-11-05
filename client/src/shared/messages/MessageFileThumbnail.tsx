import classNames from "classnames";
import { type Attachment, type Message as MessageT, useWs } from "fogbender-proto";
import { atom, type PrimitiveAtom } from "jotai";
import { useAtomValue, useUpdateAtom } from "jotai/utils";
import prettyBytes from "pretty-bytes";
import React from "react";

import { FileCard } from "../components/FileCard";
import { Icons } from "../components/Icons";
import { Avatar } from "../components/lib";
import { useAddFileToGallery } from "../files/fileGallery";
import { useJotaiQuery } from "../store/fileGalery.store";
import { useIdle } from "../utils/useIdle";

import styles from "./styles/message-file-thumbnail.module.css";
import { formatTs } from "./times";

const maxHeight = 320;
const gifMime = "image/gif";

const DisplayImage: React.FC<{
  id?: string;
  maxSize: number;
  name: string;
  setShowingFileId: (id: string | undefined) => void;
  thumbnail: NonNullable<Attachment["thumbnail"]>;
  nonInteractive: boolean;
}> = ({ id, maxSize, name, setShowingFileId, thumbnail, nonInteractive }) => {
  const size = React.useMemo(() => {
    const { url, width, height } = thumbnail || {};
    if (url && width && height) {
      return { width, height };
    } else {
      return { width: undefined, height: maxHeight };
    }
  }, [thumbnail]);
  const [width, setWidth] = React.useState<number | undefined>(size.width);
  const [aspect, setAspect] = React.useState<number>(
    width && size.height ? width / size.height : 1
  );
  return (
    <img
      tabIndex={0}
      loading="lazy"
      alt={name}
      src={thumbnail?.url}
      className="inline-block cursor-pointer rounded"
      onKeyDown={e => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          if (!nonInteractive) {
            setShowingFileId(id);
          }
        }
      }}
      onClick={e => {
        if (!(e.ctrlKey || e.shiftKey || e.altKey)) {
          e.preventDefault();
          e.stopPropagation();
          if (!nonInteractive) {
            setShowingFileId(id);
          }
        }
      }}
      onLoad={
        width === undefined
          ? e => {
              const { naturalWidth, naturalHeight } = e.target as HTMLImageElement;
              setAspect(naturalWidth / naturalHeight);
              setWidth((maxHeight * naturalWidth) / (naturalHeight || 1));
            }
          : undefined
      }
      style={{
        width: aspect > 1 ? maxSize : maxSize * aspect,
        height: aspect < 1 ? maxSize : maxSize / aspect,
        maxWidth: maxSize,
        maxHeight: maxSize,
      }}
    />
  );
};

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
    const maxSize = inReply || inUpload ? 80 : inPin ? 26 : isSingle ? 320 : 120;
    const getElement = React.useCallback(() => {
      if (!attachment || !message) {
        return null;
      }
      return <FileGalleryElement attachment={attachment} message={message} />;
    }, [attachment, message]);
    const { setShowingFileId } = useAddFileToGallery(roomId, isImage ? id : undefined, getElement);
    const [isGifPlaying, setIsGifPlaying] = React.useState(true);
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
        {isImage && thumbnail?.url ? (
          <FileCard
            title={name}
            error={fileError ? <div>{fileError}</div> : undefined}
            loading={loading}
            onTrash={onTrash}
          >
            {isImage && attachment?.contentType === gifMime ? (
              <div className={classNames("relative overflow-hidden rounded", styles.thumbnail)}>
                <DisplayImage
                  thumbnail={{
                    ...thumbnail,
                    url: isGifPlaying ? thumbnail.url : thumbnail.thumbnailDataUrl ?? dataUrl,
                  }}
                  id={id}
                  name={name}
                  maxSize={maxSize}
                  setShowingFileId={setShowingFileId}
                  nonInteractive={nonInteractive}
                />
                {!isGifPlaying && (
                  <div className="pointer-events-none absolute left-0 right-0 top-0 h-full rounded backdrop-blur-sm" />
                )}
                {!inPin && (
                  <button
                    className={classNames(
                      styles["play-pause"],
                      "absolute bottom-0 left-0 right-0 top-0  z-10 m-auto rounded-full bg-center bg-no-repeat",
                      isGifPlaying && "opacity-0",
                      inReply ? "h-8 w-8" : "h-14 w-14"
                    )}
                    onClick={e => {
                      e.stopPropagation();
                      setIsGifPlaying(prev => !prev);
                    }}
                    aria-label="play/pause gif"
                  >
                    {isGifPlaying ? (
                      <Icons.PauseCircleFilled className={playPauseIconCommonClasses} />
                    ) : (
                      <Icons.PlayCircleFilled className={playPauseIconCommonClasses} />
                    )}
                  </button>
                )}
              </div>
            ) : (
              <DisplayImage
                {...{ id, maxSize, name, setShowingFileId, thumbnail, nonInteractive }}
              />
            )}
          </FileCard>
        ) : (
          <LinkRefresher attachment={attachment} message={message}>
            {props => (
              <a
                href={props.linkHref}
                onClick={props.linkOnClick}
                target="_blank"
                rel="noopener"
                className="fog:text-link no-underline"
              >
                <FileCard
                  className={classNames(
                    "fog:text-link block flex max-w-xs items-center py-1 no-underline",
                    inReply ? "fog:text-caption-s gap-x-1 px-1" : "fog:text-caption-m gap-x-2 px-2"
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
        )}
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

const FileGalleryElement = ({
  attachment,
  message,
}: {
  attachment: Attachment;
  message: MessageT;
}) => {
  const now = new Date().getTime();
  const isExpired = attachment.fileExpirationTs / 1000 < now;
  const isIdle = useIdle(3e3, true);
  const stopEvent = React.useCallback((e?: any) => e?.stopPropagation?.(), []);
  const isImage = attachment.type === "attachment:image";
  const { filename: name, thumbnail, fileUrl, downloadUrl } = attachment;
  const [retryCount, retry] = React.useReducer(x => x + 1, 0);
  useFileRefresher(message.id, retryCount, isExpired);
  return (
    <React.Fragment>
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
      <div
        className={classNames(
          "fog:text-chat-username-m absolute bottom-10 flex w-full flex-col items-center justify-center gap-y-2 text-center text-white ",
          isIdle && !isExpired && "opacity-0 transition-opacity duration-300"
        )}
      >
        <div className="flex max-w-full items-center justify-center gap-x-2 px-4">
          {isExpired ? (
            <span className="text-red-400">
              Failed to update file information, please{" "}
              <button
                className="inline-flex text-red-400 hover:text-red-300"
                onClick={e => {
                  e.stopPropagation();
                  retry();
                }}
              >
                Retry
              </button>
            </span>
          ) : (
            <>
              <span className="truncate">
                <a href={fileUrl} onClick={stopEvent} target="_blank" rel="noopener">
                  {name}
                </a>
              </span>
              <span>
                <a href={downloadUrl} onClick={stopEvent} target="_blank" rel="noopener">
                  <Icons.Download />
                </a>
              </span>
            </>
          )}
        </div>
        {message && (
          <div className="flex flex-wrap items-center justify-center gap-x-2">
            <span>{formatTs(message.createdTs)}, by</span>
            <Avatar url={message.author.avatarUrl} name={message.author.name} size={25} />{" "}
            <span>{message.author.name}</span>
            {message.author.type === "agent" && (
              <span className="text-gray-500">
                <Icons.AgentMark />
              </span>
            )}
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

const icon =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="512" width="466" viewBox="0 0 512 512"><path d="M450.354 86.668s-1.397-2-64.997-74.668v74.668h64.997z"/><path d="M439.833 95.963v10.481h.041v372.3c0 7.326-5.96 13.286-13.287 13.286H117.768c-7.327 0-13.287-5.96-13.287-13.286V35.768c0-7.327 5.96-13.287 13.287-13.287h248.074v.019h10.48V12H117.768C104.695 12 94 22.695 94 35.768v442.976c0 13.071 10.695 23.768 23.768 23.768h308.819c13.072 0 23.768-10.696 23.768-23.768V95.963h-10.522z"/><path d="M81 81v82h219.667V81H81zm68.56 22.432h-27.263v13.343h23.533v9.536h-23.533v23.956h-11.382V93.896h38.645v9.536zm20.418 46.835h-11.382V93.896h11.382v56.371zm50.834 0h-39.683V94.358h11.382v46.411h28.301v9.498zm50.987 0h-42.874V93.896h41.798v9.536h-30.416v12.497h28.301v9.498h-28.301v15.342h31.492v9.498z"/></svg>';

const useFileRefresher = (messageId: string, retryCount: number, isExpired: boolean) => {
  const { serverCall } = useWs();
  const x = useJotaiQuery({
    enabled: isExpired,
    queryKey: messageId,
    queryFn: async () => {
      console.info("fetching new download url", messageId);
      const res = await serverCall({
        msgType: "Message.RefreshFiles",
        messageId,
      });
      if (res.msgType === "Message.Ok") {
        return res.messageId;
      } else {
        console.error("failed to refresh file", res);
        throw new Error("failed to refresh file");
      }
    },
  });
  React.useEffect(() => {
    return () => {
      x.remove();
    };
  }, [retryCount]);
};

const dataUrl =
  "data:image/webp;base64,UklGRs4CAABXRUJQVlA4WAoAAAAgAAAAPwAAPwAASUNDUBgCAAAAAAIYAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANlZQOCCQAAAAEAYAnQEqQABAAD7JUqNLr6SnpTH+OSHwGQlnAMjULffd4YHgCMxpsQPxVFTfwKSRLRtHwkpUGEuAAP7w9G0lpN/Nb4VMbNgDpzyeXNeNtea8SQSsUZHPSCt7kaRL3Zq6vYmHhQzwt6cJ1cOS98YuqbgGbvpOR5AZ2i7xgnIsC2shelJRaL6fhT3f7PME0AAA";
