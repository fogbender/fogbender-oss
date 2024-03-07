import browserDetect from "browser-detect";
import classNames from "classnames";
import Picker, { Theme } from "emoji-picker-react";
import {
  type Author,
  type Mention,
  type Message as MessageT,
  type MessageCreate,
  type MessageUpdate,
  useLoadAround,
  useSharedRoster,
  useRoomTyping,
} from "fogbender-proto";
import { useAtom, useAtomValue } from "jotai";
import React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { v4 as uuidv4 } from "uuid";

import { SourceMessages } from "../messages/MessageView";
import { modeAtom } from "../store/config.store";
import { formatCustomerName } from "../utils/format";
import { useClickOutside } from "../utils/useClickOutside";
import type { DeletedFileIdsAtom, FileIdsAtom } from "../utils/useFileUpload";
import { usePrevious } from "../utils/usePrevious";

import {
  MentionsPopup,
  useAutoCompleteUpdateFor,
  useRoomMentionDispatchFor,
} from "./AutoCompletePopup";
import { Icons } from "./Icons";
import { extractSearchString, replaceSearchStringWithResult } from "./mentions";

const TextAreaModes = ["Edit", "Reply"] as const;
export type TextAreaMode = (typeof TextAreaModes)[number];

export const useTextarea = ({
  afterSend,
  agentRole,
  cancelSelection,
  fileIdsAtom,
  deletedFileIdsAtom,
  handleUploadClick,
  helpdeskId,
  isActiveRoom,
  isAgent,
  isConnected,
  isCustomerInternal,
  messageCreate,
  messageUpdate,
  myAuthor,
  onFocus,
  roomId,
  roomName,
  selection,
  userId,
  workspaceId,
  onLastMessageEdit,
}: {
  afterSend: () => void;
  agentRole?: string;
  cancelSelection: () => void;
  fileIdsAtom: FileIdsAtom;
  deletedFileIdsAtom: DeletedFileIdsAtom;
  handleUploadClick?: () => void;
  helpdeskId: string;
  isActiveRoom: boolean;
  isAgent: boolean | undefined;
  isConnected: boolean;
  isCustomerInternal?: boolean;
  messageCreate: (params: MessageCreate) => void;
  messageUpdate: (params: MessageUpdate) => void;
  myAuthor: Author;
  onEditorChange?: (mode: TextAreaMode | undefined) => void;
  onFocus?: (roomId: string) => void;
  roomId: string;
  roomName: string | undefined;
  selection: MessageT[];
  userId: string | undefined;
  workspaceId?: string | undefined;
  onLastMessageEdit: (cb: () => void) => void;
}) => {
  const themeMode = useAtomValue(modeAtom);
  const preservedText = React.useRef("");
  const updatePreservedText = React.useCallback((text: string) => {
    preservedText.current = text;
    // todo: save to local storage
  }, []);
  const { setMentions, readMentions } = useAutoCompleteUpdateFor(roomId);
  const dispatchMentionSelector = useRoomMentionDispatchFor(roomId);
  const [acceptedMentions, setAcceptedMentions] = React.useState<Mention[]>([]);

  const { typingNames, updateTyping } = useRoomTyping({ userId, roomId });

  const { roomById } = useSharedRoster();

  const room = roomById(roomId);

  const { updateLoadAround } = useLoadAround();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const textAreaModeRef = React.useRef<HTMLDivElement>(null);

  const [focused, setFocused] = React.useState(false);
  React.useEffect(() => {
    if (focused) {
      onFocus?.(roomId);
    }
  }, [roomId, focused, onFocus]);

  const [hasText, setHasText] = React.useState(false);

  const [fileIds, resetFileUpload] = useAtom(fileIdsAtom);
  const [deletedFileIds, setDeletedFileIds] = useAtom(deletedFileIdsAtom);
  const sendIsDisabled =
    !isConnected ||
    !room ||
    (agentRole === "reader" && !isCustomerInternal) ||
    fileIds === undefined;
  const hasFiles = (fileIds?.length || 0) > 0;
  const hasTextOrFile = hasText || hasFiles;

  const updateTextArea = React.useCallback((text: string) => {
    if (!textareaRef.current) {
      return;
    }
    textareaRef.current.value = text;
    textareaRef.current.blur();
    textareaRef.current.focus();
    setHasText(text.trim().length > 0);
  }, []);

  const [mode, setMode] = React.useState<TextAreaMode | undefined>(undefined);
  const prevMode = usePrevious(mode);

  const editAllowed =
    selection.length === 1 &&
    (isAgent || selection[0]?.author.id === userId) &&
    !selection[0]?.deletedTs &&
    selection[0]?.linkType !== "forward";

  const textAreaModes = React.useMemo(
    () =>
      TextAreaModes.filter(x => {
        if (x === "Edit") {
          if (editAllowed) {
            return true;
          }
          return false;
        }
        return true;
      }),
    [editAllowed, isAgent]
  );

  React.useEffect(() => {
    setMode(mode => {
      if (selection.length === 0) {
        return undefined;
      }
      if (selection.length > 0 && mode === undefined) {
        return "Reply";
      }
      if (editAllowed && (mode === undefined || mode === "Edit")) {
        return "Edit";
      }
      return mode;
    });
  }, [selection, editAllowed]);

  React.useEffect(() => {
    if (!textareaRef.current) {
      return;
    }
    if (prevMode === mode) {
      return;
    }
    const resetToText = mode === "Edit" ? selection[0]?.rawText || "" : "";
    const isNormal = (mode: TextAreaMode | undefined) => mode === "Reply" || mode === undefined;
    // preserve
    if (isNormal(prevMode)) {
      updatePreservedText(textareaRef.current.value);
    }
    // reset and focus
    if (isNormal(mode)) {
      updateTextArea(preservedText.current);
    } else {
      updateTextArea(resetToText);
    }
  }, [mode, prevMode, selection, updatePreservedText, updateTextArea]);

  {
    const isEdit = mode === "Edit";
    React.useEffect(() => {
      setDeletedFileIds([]);
    }, [isEdit, setDeletedFileIds]);
  }

  const cancelOperation = React.useCallback(
    (shouldPreserve?: boolean) => {
      cancelSelection();
      if (textareaRef.current) {
        const value = shouldPreserve ? preservedText.current : "";
        textareaRef.current.value = value;
        setHasText(value.trim().length !== 0);
      }
    },
    [cancelSelection]
  );

  const sendMessage = React.useCallback(
    (text: string, fileIds: string[]) => {
      const linkStartMessageId = selection[0]?.id;
      const linkEndMessageId = selection.slice(-1)[0]?.id;
      if (mode === undefined) {
        messageCreate({
          msgType: "Message.Create",
          clientId: uuidv4(),
          roomId,
          text,
          mentions: acceptedMentions,
          fileIds,
        });
      } else if (mode === "Reply" && linkStartMessageId && linkEndMessageId) {
        messageCreate({
          msgType: "Message.Create",
          clientId: uuidv4(),
          roomId,
          text,
          linkRoomId: roomId,
          linkStartMessageId,
          linkEndMessageId,
          linkType: "reply",
          mentions: acceptedMentions,
          fileIds,
        });
      }
      afterSend();

      resetFileUpload();

      setMentions(undefined);
      setAcceptedMentions([]);

      cancelOperation();
    },
    [
      messageCreate,
      roomId,
      mode,
      selection,
      cancelOperation,
      afterSend,
      setMentions,
      acceptedMentions,
      resetFileUpload,
    ]
  );

  const updateMessage = React.useCallback(
    (text: string) => {
      if (mode === "Edit" && editAllowed) {
        const original = selection[0];
        messageUpdate({
          msgType: "Message.Update",
          messageId: original.id,
          text,
          fileIds: [
            ...original.files.map(x => x.id).filter(x => !deletedFileIds.includes(x)),
            ...(fileIds || []),
          ],
          linkRoomId: original.linkRoomId,
          linkStartMessageId: original.linkStartMessageId,
          linkEndMessageId: original.linkEndMessageId,
          linkType: original.linkType,
          mentions: (original.mentions || [])
            .map(x => ({ msgType: "Message.Mention" as const, id: x.id, text: x.text }))
            .concat(acceptedMentions)
            .reduce(
              (acc, x) => (acc.find(y => y.id === x.id) ? acc : acc.concat(x)),
              [] as Mention[]
            ),
        });
      }
      resetFileUpload();
      setMentions(undefined);
      setAcceptedMentions([]);
      cancelOperation();
    },
    [
      mode,
      editAllowed,
      resetFileUpload,
      setMentions,
      cancelOperation,
      selection,
      messageUpdate,
      fileIds,
      acceptedMentions,
      deletedFileIds,
    ]
  );

  const doSend = React.useCallback(() => {
    const text = textareaRef.current?.value.trim();
    if (
      sendIsDisabled ||
      ((!text || text.length === 0) && (fileIds === undefined || fileIds.length === 0))
    ) {
      return;
    }
    if (!mode || mode === "Reply") {
      sendMessage(text || "", fileIds || []);
    }
    if (!text || text.length === 0) {
      return;
    }
    if (mode === "Edit") {
      updateMessage(text);
    }
  }, [sendIsDisabled, mode, sendMessage, updateMessage, fileIds]);

  const handleMentions = React.useCallback(
    (target: HTMLTextAreaElement) => {
      if (mode !== undefined && mode !== "Reply" && mode !== "Edit") {
        setMentions(undefined);
        return;
      }
      const { selectionStart, selectionEnd } = target;
      if (selectionStart !== selectionEnd) {
        setMentions(undefined); // hide mentions
      } else {
        // hide or show depending on fuzzy search
        // TODO: disable in code blocks
        const searchString = extractSearchString("@", target.value, selectionStart);
        setMentions(searchString);
      }
    },
    [mode, setMentions]
  );

  React.useEffect(() => {
    if (textareaRef.current) {
      handleMentions(textareaRef.current);
    }
  }, [mode, setMentions, handleMentions]);

  const onEditorKeyUp = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      handleMentions(e.currentTarget);
    },
    [handleMentions]
  );

  const onPointerUp = React.useCallback(
    (e: React.PointerEvent<HTMLTextAreaElement>) => {
      handleMentions(e.currentTarget);
    },
    [handleMentions]
  );

  const onEditorKeyPress = React.useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!browserDetect().mobile) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          doSend();
        }
      }
    },
    [doSend]
  );

  const onChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (mode === undefined || mode === "Reply") {
        updateTyping();
      }
      // selectionStart === selectionEnd for onChange
      handleMentions(e.currentTarget);
      setHasText(textareaRef.current?.value.trim().length !== 0);
    },
    [mode, updateTyping]
  );

  const onMentionAccepted = React.useCallback(
    (id: string, roomName: string, command: string) => {
      const textarea = textareaRef.current;
      if (textarea) {
        const { value, selectionStart } = textarea;
        const { newValue, newSelectionStart } = replaceSearchStringWithResult(
          value,
          "@",
          roomName + command,
          selectionStart
        );
        textarea.value = newValue;
        textarea.setSelectionRange(newSelectionStart, newSelectionStart);
        setAcceptedMentions(mentions =>
          mentions
            .filter(x => x.id !== id)
            .concat({ msgType: "Message.Mention", id, text: roomName })
        );
        setMentions(undefined);
      }
    },
    [setMentions]
  );

  const textareaValue = textareaRef.current?.value;

  const listMenuRef = React.useRef<HTMLSpanElement>(null);
  const [showListMenu, setShowListMenu] = React.useState(false);
  useClickOutside(
    listMenuRef,
    () => {
      setShowListMenu(false);
    },
    !showListMenu
  );

  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const [showEmojiSelect, setShowEmojiSelect] = React.useState(false);
  useClickOutside(
    emojiPickerRef,
    () => {
      setShowEmojiSelect(false);
    },
    !showEmojiSelect
  );

  const [emoji, setEmoji] = React.useState<string>();
  React.useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && emoji) {
      const { value, selectionStart, selectionEnd } = textarea;
      updateTextArea(value.slice(0, selectionStart) + emoji + value.slice(selectionEnd));
      textarea.setSelectionRange(selectionEnd + emoji.length, selectionEnd + emoji.length);
      setEmoji(undefined);
    }
  }, [emoji]);

  const [textAreaHeight, setTextAreaHeight] = React.useState(0);

  const sendButtonColor = () => {
    let color = "text-red-100";

    if (hasTextOrFile && isActiveRoom) {
      if (!sendIsDisabled) {
        color = "text-blue-500 dark:text-blue-700";
      }
    } else {
      color = "text-gray-200 dark:text-gray-600";
    }

    return color;
  };

  let placeholder = "";

  if (roomName && roomId) {
    placeholder = !!isCustomerInternal
      ? roomName
      : isAgent
      ? roomName + " " + `(${formatCustomerName(roomById(roomId)?.customerName)})`
      : roomName;
  }
  const typingContent = (
    <span
      className={classNames(
        "absolute left-10 -translate-y-4 h-4 flex-1 mb-1 truncate text-gray-500 fog:text-caption-m transition-opacity duration-1000",
        {
          "opacity-100": typingNames,
          "opacity-0": !typingNames,
        }
      )}
    >
      {typingNames ? typingNames + "..." : ""}
    </span>
  );

  const Textarea = React.useMemo(() => {
    return (
      <div className={classNames("relative pr-2 py-5")}>
        {typingContent}
        <div className="flex items-center">
          {showListMenu && (
            <span ref={listMenuRef} className="absolute left-2 bottom-12 z-[11]">
              <div
                className={classNames(
                  "flex flex-col bg-white fog:box-shadow-m rounded-lg fog:text-body-m py-1.5",
                  "dark:bg-gray-700 dark:text-white"
                )}
              >
                {(mode === undefined || mode === "Reply" || mode === "Edit") && (
                  <div
                    className={classNames(
                      "group flex content-center gap-2 pl-4 pr-10 py-1.5",
                      sendIsDisabled
                        ? "text-gray-200 cursor-not-allowed"
                        : "hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                    )}
                    onClick={sendIsDisabled ? undefined : handleUploadClick}
                  >
                    <Icons.Paperclip
                      className={classNames(
                        "w-6",
                        !sendIsDisabled &&
                          "text-gray-500 dark:text-gray-400 group-hover:text-gray-800"
                      )}
                    />
                    Upload a file...
                  </div>
                )}
                <div
                  className="group flex content-center gap-2 pl-4 pr-10 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => {
                    setShowEmojiSelect(true);
                    setShowListMenu(false);
                  }}
                >
                  <Icons.EmojiSelect className="w-6 text-gray-500 dark:text-gray-400 group-hover:text-gray-800" />
                  Emoji selector
                </div>
              </div>
            </span>
          )}

          {handleUploadClick && (
            <div
              className={classNames(
                "px-2",
                mode === undefined || mode === "Reply" || mode === "Edit"
                  ? "text-gray-500 cursor-pointer"
                  : "text-gray-200"
              )}
              onClick={() => {
                if (mode === undefined || mode === "Reply" || mode === "Edit") {
                  const x = !showListMenu;
                  setShowListMenu(x);
                  setShowEmojiSelect(false);
                }
              }}
            >
              <Icons.Menu className="w-5" />
            </div>
          )}

          {showEmojiSelect && (
            <div ref={emojiPickerRef} className="absolute left-2 bottom-12 z-[21]">
              <Picker
                theme={themeMode === "dark" ? Theme.DARK : Theme.LIGHT}
                onEmojiClick={emoji => {
                  setEmoji(emoji.emoji);
                }}
              />
            </div>
          )}

          {userId && (
            <MentionsPopup
              isPrivate={room?.type === "private"}
              userId={userId}
              workspaceId={workspaceId}
              helpdeskId={helpdeskId}
              hide={!focused}
              roomId={roomId}
              onMentionAccepted={onMentionAccepted}
              bottomOffset={textAreaHeight}
              isAgent={isAgent}
              myAuthor={myAuthor}
            />
          )}
          {selection.length > 0 && (
            <div
              ref={textAreaModeRef}
              className={classNames(
                "absolute pl-9 pr-12 pt-4 top-4 w-full border-t text-gray-500 -translate-y-full bg-white dark:bg-black z-10"
              )}
            >
              {typingContent}
              {selection.length === 1 && mode === "Reply" && (
                <div className="mb-1 dark:text-white">
                  <SourceMessages
                    isAgent={selection[0].author.type === "agent"}
                    sourceMessages={[selection[0]]}
                    linkType="reply"
                    linkStartMessageId={selection[0].id}
                    linkEndMessageId={selection[0].id}
                  />
                </div>
              )}
              {selection.length > 0 && (
                <div
                  className={classNames(
                    "mb-1 rounded",
                    isActiveRoom ? "bg-blue-50" : "bg-gray-100",
                    "dark:bg-indigo-950"
                  )}
                >
                  <div className="flex relative items-center">
                    {textAreaModes.map((x, i) => (
                      <span
                        key={x}
                        className={classNames(
                          "md:py-1 md:px-3 py-0.5 px-1 fog:text-caption-m",
                          i === 0 && "rounded-l",
                          x === mode
                            ? "text-white"
                            : isActiveRoom
                            ? "text-blue-500 dark:text-blue-300 hover:text-brand-red-500 dark:hover:text-brand-red-500"
                            : "text-gray-500",
                          x === mode
                            ? isActiveRoom
                              ? "bg-blue-500"
                              : "bg-gray-300"
                            : "cursor-pointer"
                        )}
                        onClick={() => {
                          setMode(x);
                        }}
                      >
                        {x}
                      </span>
                    ))}
                    <span
                      className={classNames(
                        "flex-1 pl-1 pr-6 text-right fog:text-body-s truncate cursor-pointer",
                        isActiveRoom ? "text-blue-500 dark:text-blue-300" : "text-gray-500",
                        "hover:text-brand-red-500 dark:hover:text-brand-red-500"
                      )}
                      onClick={() => {
                        updateLoadAround(roomId, selection[0]?.id);
                      }}
                    >
                      {selection.length} {selection.length === 1 ? "message" : "messages"} selected
                    </span>
                    <span
                      className={classNames(
                        "absolute right-0 px-1 text-gray-500 cursor-pointer",
                        "dark:text-gray-400",
                        isActiveRoom ? "bg-blue-50 dark:bg-indigo-950" : "bg-gray-100",
                        "hover:text-brand-red-500 dark:hover:text-brand-red-500"
                      )}
                      onClick={() => cancelOperation(true)}
                    >
                      <Icons.XCircleFilled />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex-1 truncate">
            <div className="relative">
              <TextareaAutosize
                ref={textareaRef}
                onChange={onChange}
                onKeyUp={onEditorKeyUp}
                onKeyDown={e => {
                  /*
                const UP = 38;
                const DOWN = 40;
                const TAB = 9;
                const ENTER = 13;
                */
                  const isUp = e.key === "ArrowUp";
                  const isDown = e.key === "ArrowDown";
                  const isEnterOrTab = e.key === "Tab" || e.key === "Enter";
                  if (isEnterOrTab || isUp || isDown) {
                    readMentions().then(mentions => {
                      // mentions is undefined if mention picker is not visible
                      // and is a search string otherwise
                      if (mentions !== undefined) {
                        const res = dispatchMentionSelector(
                          isEnterOrTab ? "enter_or_tab" : isUp ? "up" : "down"
                        );
                        // bail out if we can't accept the mention
                        if (res === "cant_accept") {
                          return;
                        }
                        // still can't believe you can stop event propagation from async function
                        e.preventDefault();
                      }
                      if (
                        mentions === undefined &&
                        isUp &&
                        selection.length === 0 &&
                        !textareaValue
                      ) {
                        onLastMessageEdit(() => {
                          setMode("Edit");
                          e.preventDefault();
                        });
                      }
                    });
                  }
                }}
                onKeyPress={onEditorKeyPress}
                onPointerUp={onPointerUp}
                onHeightChange={setTextAreaHeight}
                maxRows={!!textareaValue && (!mode || mode === "Reply" || mode === "Edit") ? 4 : 1}
                className={classNames(
                  "fbr-scrollbar resize-none w-full py-1.5 px-2.5 rounded text-black placeholder:text-gray-500 dark:placeholder:text-gray-400 fbr-placeholder-truncate text-base sm:text-sm focus:outline-none",
                  "dark:text-white",
                  "border",
                  focused
                    ? "bg-blue-50 dark:bg-gray-700 border-transparent"
                    : "bg-gray-100 dark:bg-brand-dark-bg border-transparent dark:border-gray-700"
                )}
                onFocus={() => {
                  setFocused(true);
                }}
                onBlur={() => setFocused(false)}
                placeholder={placeholder}
              />
            </div>
          </div>
          <div onClick={doSend} className={classNames("ml-2 cursor-pointer", sendButtonColor())}>
            <Icons.MessageSend />
          </div>
        </div>
      </div>
    );
  }, [
    dispatchMentionSelector,
    cancelOperation,
    doSend,
    focused,
    hasText,
    mode,
    onChange,
    onEditorKeyPress,
    onEditorKeyUp,
    onPointerUp,
    readMentions,
    room?.type,
    workspaceId,
    roomId,
    onMentionAccepted,
    selection,
    userId,
    updateLoadAround,
  ]);
  return { Textarea, mode, textareaRef, textAreaModeRef };
};
