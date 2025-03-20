import { type FileUpload, type Message, useWs } from "fogbender-proto";
import { atom, type PrimitiveAtom, useAtom } from "jotai";
import { useImmerAtom } from "jotai-immer";
import prettyBytes from "pretty-bytes";
import React, { Suspense } from "react";

import { MessageFileThumbnail } from "../messages/MessageFileThumbnail";
import { fileToBuffer } from "../utils/readFile";
import type { FileUploads, Upload } from "../utils/useFileUpload";

export const fileToAtom = (file: File) => {
  const fileIdAtom = atom<string | undefined>(undefined);
  fileIdAtom.debugLabel = `fileId ${file.name}`;
  return { file, fileIdAtom };
};

export const FileUploadPreview: React.FC<{
  roomId: string;
  fileUploadAtom: PrimitiveAtom<FileUploads>;
  deleteFileIdsAtom: PrimitiveAtom<string[]>;
  editingMessage: Message | undefined;
  isTextAreaEmpty: boolean;
  afterRemove: (fileName: string) => void;
}> = ({
  afterRemove,
  roomId,
  fileUploadAtom,
  deleteFileIdsAtom,
  editingMessage,
  isTextAreaEmpty,
}) => {
  const [deleteFileIds, setDeleteFileIds] = useImmerAtom(deleteFileIdsAtom);
  const [fileUpload, set] = useImmerAtom(fileUploadAtom);

  const remove = (file: File) => {
    set(d => {
      if (d) {
        d.files = d.files.filter(f => f.file !== file);
      }
    });
    afterRemove(file.name); // Ensure that the specified file is removed from the input's file list as well
  };
  const { files: uploads } = fileUpload;

  const messageFiles = React.useMemo(
    () => (editingMessage?.files || []).filter(x => !deleteFileIds.includes(x.id)),
    [editingMessage, deleteFileIds]
  );

  if (!uploads.length && !messageFiles.length) {
    if (messageFiles.length === 0 && deleteFileIds.length > 0) {
      return (
        <div className="fbr-scrollbar -mt-4 mb-4 ml-4 mr-4 flex flex-row items-center gap-x-2 overflow-x-auto pt-4 pb-2 pl-1 pr-4">
          <div className="items-center">
            <span className="text-sm text-gray-500">Removing all files</span>
            {isTextAreaEmpty === true && (
              <span className="text-sm text-gray-500"> &mdash; add text to continue</span>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div>
      <div className="fbr-scrollbar -mt-4 mb-4 ml-4 mr-4 flex flex-row items-center gap-x-2 overflow-x-auto pt-4 pb-2 pl-1 pr-4">
        {editingMessage &&
          messageFiles.map(file => (
            <MessageFileThumbnail
              key={file.id}
              id={`${editingMessage.id}:${file.id}`}
              roomId={roomId}
              attachment={file}
              name={file.filename || ""}
              fileSize={file.fileSize}
              thumbnail={file.thumbnail}
              isImage={file.type === "attachment:image"}
              isSingle={false}
              inReply={false}
              message={editingMessage}
              onTrash={() => {
                setDeleteFileIds(draft => {
                  draft.push(file.id);
                });
              }}
            />
          ))}
        {uploads.map(upload => (
          <FilePreview
            key={upload.fileIdAtom.toString()}
            roomId={roomId}
            upload={upload}
            remove={remove}
          />
        ))}
      </div>
    </div>
  );
};

const loadImage = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () =>
      typeof reader.result === "string" ? resolve(reader.result) : reject(reader.result);
    reader.onerror = error => reject(error);
  });

export const FilePreview: React.FC<{
  roomId: string;
  upload: Upload;
  remove: (file: File) => void;
}> = ({ roomId, upload, remove }) => {
  const { file, fileIdAtom } = upload;
  const [imageUrl, setImageUrl] = React.useState<string>();
  const [error, setError] = React.useState<string>();
  React.useEffect(() => {
    if (file.type.match(/^image/)) {
      loadImage(file)
        .then(setImageUrl)
        .catch(e => setError(`${e}`));
    }
  }, [file]);
  const [fileId] = useAtom(fileIdAtom);

  return (
    <>
      <MessageFileThumbnail
        roomId={roomId}
        name={file.name}
        fileSize={file.size}
        thumbnail={
          imageUrl
            ? { url: imageUrl, width: 80, height: 80, original_width: 80, original_height: 80 }
            : undefined
        }
        isImage={imageUrl !== undefined}
        inUpload={true}
        fileError={error}
        loading={!fileId && !error}
        onTrash={() => remove(file)}
      />
      <Suspense fallback={null}>
        <Uploader roomId={roomId} upload={upload} onError={setError} />
      </Suspense>
    </>
  );
};

// Max upload size, in bytes -- match server's file_size_limit.
const FILE_SIZE_LIMIT = 20_971_520;

const Uploader: React.FC<{
  roomId: string;
  upload: Upload;
  onError: (errorMessage?: string) => void;
}> = ({ roomId, upload, onError }) => {
  const { serverCall } = useWs();
  const { file, fileIdAtom } = upload;

  const [uploadAtom] = React.useState(() =>
    atom(null, async (get, set) => {
      if (get(fileIdAtom)) {
        // to prevent uploading second time if `fileId` is already there
        return;
      }
      const fileContent = await fileToBuffer(file);
      if (fileContent.length >= FILE_SIZE_LIMIT) {
        onError(`Too large (> ${prettyBytes(FILE_SIZE_LIMIT)})`);
      }
      // make sure it's in sync with `file_size_limit` on server
      if (roomId && fileContent.length < FILE_SIZE_LIMIT) {
        const res = await serverCall<FileUpload>({
          msgType: "File.Upload",
          fileName: file.name,
          fileType: file.type,
          binaryData: fileContent,
          roomId,
        });
        if (res.msgType !== "File.Ok") {
          if (res.error === "Binaries not supported") {
            onError(res.error);
          } else {
            onError("Upload error");
          }
          throw res;
        }
        const { fileId } = res;
        // await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000)); /* to slow down upload on dev */
        set(fileIdAtom, fileId);
      }
    })
  );
  const [, onUpload] = useAtom(uploadAtom);
  React.useEffect(() => {
    onUpload();
  }, [onUpload]);
  return null;
};
