import React from "react";
import { flushSync } from "react-dom";
import type { Message as MessageT } from "fogbender-proto";

import { usePrevious } from "./usePrevious";

export const useScrollTracker = ({
  isActiveRoom,
  messages,
  loadAroundMessage,
  historyRef,
  resizing,
  dragging,
  newerHistoryComplete,
  fetchNewerPage,
  fetchingNewer,
  olderHistoryComplete,
  fetchOlderPage,
  fetchingOlder,
  onSeen,
  isIdle,
  isConnected,
  selection,
  onSelectionHover,
}: {
  isActiveRoom: boolean;
  messages: { id: string; createdTs: number }[];
  loadAroundMessage: { messageId: string; roomId: string; ts: number } | undefined;
  historyRef: React.RefObject<HTMLDivElement>;
  resizing: boolean | undefined;
  dragging: boolean | undefined;
  newerHistoryComplete: boolean;
  fetchNewerPage: (ts: number) => void;
  fetchingNewer: boolean;
  olderHistoryComplete: boolean;
  fetchOlderPage: (ts: number) => void;
  fetchingOlder: boolean;
  onSeen: (id: string) => void;
  isIdle: boolean;
  isConnected: boolean;
  selection: MessageT[];
  onSelectionHover: boolean;
}) => {
  const prevMessages = usePrevious(messages);
  const messagesRefs = React.useRef<Set<HTMLDivElement>>(new Set<HTMLDivElement>());

  const onMessageRef = React.useCallback((ref: HTMLDivElement | null) => {
    if (ref) {
      messagesRefs.current.add(ref);
    }
  }, []);

  const prevChatRefState = usePrevious<{
    prevScrollHeight: number | undefined;
    prevScrollTop: number | undefined;
    prevClientHeight: number | undefined;
  }>({
    prevScrollHeight: historyRef.current?.scrollHeight,
    prevScrollTop: historyRef.current?.scrollTop,
    prevClientHeight: historyRef.current?.clientHeight,
  });

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  const [keepScrollAtBottom, setKeepScrollAtBottom] = React.useState(true);

  React.useLayoutEffect(() => {
    if (historyRef.current && prevChatRefState) {
      const { prevScrollHeight, prevScrollTop } = prevChatRefState;
      const { scrollHeight } = historyRef.current;

      if (
        !keepScrollAtBottom &&
        prevScrollHeight !== undefined &&
        prevScrollTop !== undefined &&
        scrollHeight > prevScrollHeight
      ) {
        if (messages[0]?.id !== prevMessages?.[0]?.id) {
          historyRef.current.scrollTop = scrollHeight - prevScrollHeight + prevScrollTop;
        } else if (messages.slice(-1)[0]?.id !== prevMessages?.slice(-1)[0]?.id) {
          historyRef.current.scrollTop = prevScrollTop;
        }
        forceUpdate();
      }
    }
  }, [keepScrollAtBottom, prevChatRefState, messages, prevMessages, historyRef]);

  // Fix scrolling glitch that comes from reordering DOM nodes with drag-and-drop.
  // This causes scrollTop silently reset to 0, and here we're preserving it to the value when drag started
  React.useEffect(() => {
    const keepScrollTop = dragging ? historyRef.current?.scrollTop : undefined;
    return () => {
      requestAnimationFrame(() => {
        if (historyRef.current && keepScrollTop) {
          historyRef.current.scrollTop = keepScrollTop;
        }
      });
    };
  }, [dragging]);

  React.useEffect(() => {
    // When unmounted, preserve previous scroll position
    let keepScrollTop: number | undefined;
    if (!historyRef.current) {
      keepScrollTop = prevChatRefState?.prevScrollTop;
    }
    return () => {
      requestAnimationFrame(() => {
        if (historyRef.current && keepScrollTop) {
          historyRef.current.scrollTop = keepScrollTop;
        }
      });
    };
  }, [historyRef.current]);

  const maybeStickToBottom = React.useCallback(() => {
    if (!loadAroundMessage && keepScrollAtBottom && historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [loadAroundMessage, keepScrollAtBottom, historyRef]);

  const oldestMessage = messages[0];
  const newestMessage = messages[messages.length - 1];

  React.useEffect(() => {
    // If the page is smaller than clientHeight and there's more history to be fetched,
    // lack of scrollbar will make it impossible.
    // This bit attempts to load more history if there's no scrollbar after initial render.
    if (prevMessages && historyRef.current) {
      if (oldestMessage && newestMessage) {
        const { scrollHeight, clientHeight } = historyRef.current;

        if (scrollHeight === clientHeight) {
          if (!olderHistoryComplete && !fetchingOlder && isConnected) {
            fetchOlderPage(oldestMessage.createdTs);
          }

          if (!newerHistoryComplete && !fetchingNewer && isConnected) {
            fetchNewerPage(newestMessage.createdTs);
          }
        }
      }
    }
  }, [
    newestMessage,
    newerHistoryComplete,
    fetchNewerPage,
    fetchingNewer,
    oldestMessage,
    olderHistoryComplete,
    fetchOlderPage,
    fetchingOlder,
    prevMessages,
    prevChatRefState,
    historyRef,
    isConnected,
  ]);

  const onSeenThrottled = useOnSeenDebounced(onSeen);

  const calcMessagesInView = React.useCallback(() => {
    const messagesInView: string[] = [];

    messagesRefs.current.forEach(m => {
      if (historyRef.current) {
        const { top, bottom } = m.getBoundingClientRect();
        const { top: hTop, bottom: hBottom } = historyRef.current.getBoundingClientRect();
        if ((top >= hTop && hBottom - top >= 30) || (bottom <= hBottom && bottom - hTop >= 30)) {
          messagesInView.push(m.id);
        }
      }
    });

    messagesInView.sort();

    const maxId = messagesInView.slice(-1)[0];
    if (maxId && isActiveRoom && !isIdle && isConnected && !loadAroundMessage?.messageId) {
      onSeenThrottled(maxId);
    }

    return messagesInView;
  }, [historyRef, isActiveRoom, isIdle, onSeenThrottled, isConnected, loadAroundMessage]);

  const checkBottom = React.useCallback(() => {
    if (historyRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = historyRef.current;

      if (newerHistoryComplete && !resizing) {
        if (
          clientHeight + scrollTop + 1 >= scrollHeight &&
          selection.length === 0 &&
          !onSelectionHover
        ) {
          setTimeout(() => {
            flushSync(() => {
              setKeepScrollAtBottom(true);
            });
          }, 0);
        } else {
          setKeepScrollAtBottom(false);
        }
      }
    }
  }, [historyRef, resizing, newerHistoryComplete, selection, onSelectionHover]);

  React.useEffect(() => {
    if (loadAroundMessage) {
      setKeepScrollAtBottom(false);
    }
    calcMessagesInView();
    checkBottom();
  }, [checkBottom, calcMessagesInView, messages, resizing, loadAroundMessage]);

  const onHistoryScroll = React.useCallback(() => {
    if (historyRef.current && prevChatRefState) {
      checkBottom();

      const messagesInView = calcMessagesInView();

      if (
        oldestMessage &&
        messagesInView.length &&
        oldestMessage.id === messagesInView[0] &&
        !fetchingOlder &&
        !olderHistoryComplete &&
        isConnected
      ) {
        fetchOlderPage(oldestMessage.createdTs);
      }

      if (
        newestMessage &&
        messagesInView.length &&
        newestMessage.id === messagesInView[messagesInView.length - 1] &&
        !fetchingNewer &&
        !newerHistoryComplete &&
        isConnected
      ) {
        fetchNewerPage(newestMessage.createdTs);
      }
    }
  }, [
    checkBottom,
    calcMessagesInView,
    prevChatRefState,
    fetchNewerPage,
    fetchingNewer,
    fetchOlderPage,
    fetchingOlder,
    newerHistoryComplete,
    newestMessage,
    olderHistoryComplete,
    oldestMessage,
    historyRef,
    isConnected,
  ]);

  return {
    onMessageRef,
    onHistoryScroll,
    keepScrollAtBottom,
    setKeepScrollAtBottom,
    maybeStickToBottom,
  };
};

function useOnSeenDebounced(onSeen: (id: string) => void) {
  const throttleDelay = 2000;
  const debounceDelay = 500;
  const last = React.useRef<{ id: string | undefined; time: number }>({
    id: undefined,
    time: 0,
  });
  const timer = React.useRef<number | undefined>();
  return React.useCallback(
    (id: string) => {
      const now = Date.now();
      if (last.current.id === undefined || id > last.current.id) {
        last.current.id = id;
        if (now - last.current.time > throttleDelay) {
          last.current.time = now;
          triggerUpdate();
        } else {
          queueUpdate();
        }
      }
      function triggerUpdate() {
        last.current.id && onSeen(last.current.id);
      }
      function queueUpdate() {
        clearTimeout(timer.current);
        timer.current = window.setTimeout(triggerUpdate, debounceDelay);
      }
    },
    [onSeen]
  );
}
