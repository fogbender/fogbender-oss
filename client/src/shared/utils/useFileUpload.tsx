import { atom, type PrimitiveAtom, type WritableAtom } from "jotai";
import { useUpdateAtom } from "jotai/utils";
import React from "react";
import { useDropzone } from "react-dropzone";

import { fileToAtom } from "../components/FileUpload";

export interface Upload {
  file: File;
  fileIdAtom: PrimitiveAtom<string | undefined>;
}

export type FileUploads = { files: Upload[] };
export type FileIdsAtom = WritableAtom<string[] | undefined, undefined>;
export type DeletedFileIdsAtom = WritableAtom<string[], string[]>;

export const useFileUpload = ({
  roomId,
  isActiveRoom,
}: {
  roomId: string;
  isActiveRoom: boolean;
}) => {
  const fileUploadAtom = React.useMemo(() => atom<FileUploads>({ files: [] }), []);

  const fileIdsAtom = React.useMemo(
    () =>
      atom(
        get => {
          const fileIds = get(fileUploadAtom)?.files.map(x => get(x.fileIdAtom));
          if (fileIds?.every((x): x is string => x !== undefined)) {
            return fileIds;
          }
          return;
        },
        (_get, set, _reset?: undefined) => {
          set(fileUploadAtom, { files: [] });
        }
      ),
    [fileUploadAtom]
  );

  const setUpload = useUpdateAtom(fileUploadAtom);

  const onNewDrop = React.useCallback(
    (acceptedFiles: File[]) => {
      setUpload(({ files }) => ({
        files: [...files, ...acceptedFiles.map(fileToAtom)],
      }));
    },
    [setUpload]
  );

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    noClick: true,
    onDrop: onNewDrop,
  });

  React.useEffect(() => {
    if (isActiveRoom) {
      const listener = (e: ClipboardEvent) => {
        if (e.clipboardData?.files?.length) {
          onNewDrop(Array.from(e.clipboardData.files));
          e.preventDefault();
        }
      };
      document.addEventListener("paste", listener);
      return () => document.removeEventListener("paste", listener);
    } else {
      return undefined;
    }
  }, [isActiveRoom, onNewDrop, roomId]);

  const deletedFileIdsAtom = React.useMemo(() => atom<string[]>([]), []);

  return {
    getInputProps,
    getRootProps,
    isDragActive,
    fileUploadAtom,
    fileIdsAtom,
    deletedFileIdsAtom,
  };
};
