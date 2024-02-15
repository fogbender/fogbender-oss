import classNames from "classnames";
import React from "react";
import { type Attachment, } from "fogbender-proto";

import { FileCard } from "../components/FileCard";
import { Icons } from "../components/Icons";

import styles from "./styles/message-file-thumbnail.module.css";

const maxHeight = 320;
const gifMime = "image/gif";

export const ImageFileCard = ({
  name,
  fileError,
  loading,
  onTrash,
  attachment,
  thumbnail,
  nonInteractive,
  setShowingFileId,
  maxSize,
  id,
  playPauseIconCommonClasses,
  inReply,
  inPin,
  isImage,
}: {
  name: string;
  fileError: string | undefined;
  loading: boolean | undefined;
  onTrash?: () => void;
  attachment: Attachment | undefined;
  thumbnail: NonNullable<Attachment["thumbnail"]>;
  nonInteractive: boolean;
  setShowingFileId: (x: string | undefined) => void;
  maxSize: number;
  id: string | undefined;
  playPauseIconCommonClasses: string;
  inReply: boolean | undefined;
  inPin: boolean | undefined;
  isImage: boolean;
}) => {
  const [isGifPlaying, setIsGifPlaying] = React.useState(true);
  return (
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
  );
};

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

const dataUrl =
  "data:image/webp;base64,UklGRs4CAABXRUJQVlA4WAoAAAAgAAAAPwAAPwAASUNDUBgCAAAAAAIYAAAAAAQwAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANlZQOCCQAAAAEAYAnQEqQABAAD7JUqNLr6SnpTH+OSHwGQlnAMjULffd4YHgCMxpsQPxVFTfwKSRLRtHwkpUGEuAAP7w9G0lpN/Nb4VMbNgDpzyeXNeNtea8SQSsUZHPSCt7kaRL3Zq6vYmHhQzwt6cJ1cOS98YuqbgGbvpOR5AZ2i7xgnIsC2shelJRaL6fhT3f7PME0AAA";
