import { flushSync } from "react-dom";
import React from "react";
import type { Message as MessageT } from "fogbender-proto";

import { findLast } from "../utils/findLast";

export function useSelection({
  messages,
  userId,
}: {
  messages: MessageT[];
  userId?: string | undefined;
}) {
  const [selection, setSelection] = React.useState<MessageT[]>([]);
  const [lastSelected, setLastSelected] = React.useState<MessageT>();

  const handleMessageClick = React.useCallback(
    (msg: MessageT) => {
      let newSelection = selection.concat();
      if (selection.findIndex(x => x.id === msg.id) >= 0) {
        newSelection = selection.filter(x =>
          lastSelected && lastSelected.id <= msg.id ? x.id > msg.id : x.id < msg.id
        );
      } else {
        if (selection.length === 0) {
          newSelection = selection.concat(msg);
        } else if (msg.id > selection.slice(-1)[0]?.id) {
          newSelection = messages.filter(x => selection[0]?.id <= x.id && x.id <= msg.id);
        } else {
          newSelection = messages.filter(x => msg.id <= x.id && x.id <= selection.slice(-1)[0]?.id);
        }
      }
      setTimeout(() => {
        flushSync(() => {
          setSelection(newSelection);
        });
      }, 0);
      setLastSelected(newSelection.length > 0 ? msg : undefined);
    },
    [selection, lastSelected, messages]
  );

  const handleSelectionCancel = React.useCallback(() => {
    setSelection([]);
    setLastSelected(undefined);
  }, []);

  const handleLastMessageEdit = React.useCallback(
    (cb: () => void) => {
      const lastMessage = findLast(
        messages,
        x => x.author.id === userId && x.deletedTs === null && x.linkType !== "forward"
      );
      if (lastMessage) {
        setSelection([lastMessage]);
        cb();
      }
    },
    [messages, userId]
  );

  return {
    selection,
    handleMessageClick,
    handleSelectionCancel,
    handleLastMessageEdit,
  };
}
