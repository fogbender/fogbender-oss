import classNames from "classnames";
import Picker, { Theme } from "emoji-picker-react";
import { Reaction } from "fogbender-proto";
import { useAtomValue } from "jotai";
import React from "react";

import { Icons } from "../components/Icons";
import { modeAtom } from "../store/config.store";
import { LocalStorageKeys } from "../utils/LocalStorageKeys";
import { SafeLocalStorage } from "../utils/SafeLocalStorage";
import { useClickOutside } from "../utils/useClickOutside";

const defaultEmojis = ["👍", "🔥", "❤️", "✅"];

const getRecentEmojis = () => {
  let emojis = defaultEmojis;
  try {
    const recentEmojis = JSON.parse(
      SafeLocalStorage.getItem(LocalStorageKeys.RecentEmojis) || "null"
    );
    if (Array.isArray(recentEmojis)) {
      emojis = recentEmojis.filter((x): x is string => typeof x === "string");
    }
  } catch (e) {}
  return emojis;
};

const updateRecentEmojis = (newEmoji: string) => {
  const recentEmojis = getRecentEmojis().filter(x => x !== newEmoji);
  SafeLocalStorage.setItem(
    LocalStorageKeys.RecentEmojis,
    JSON.stringify([newEmoji].concat(recentEmojis).slice(0, 4))
  );
};

export const AddMessageReaction: React.FC<{
  setReaction: (reaction: string) => void;
}> = ({ setReaction }) => {
  const recentEmojis = React.useMemo(getRecentEmojis, []);
  return (
    <div className="flex">
      {recentEmojis.map(emoji => (
        <span
          key={emoji}
          role="img"
          onClick={() => {
            setReaction(emoji);
            updateRecentEmojis(emoji);
          }}
          className="flex cursor-pointer rounded px-1 hover:outline hover:outline-1 hover:outline-blue-200"
        >
          {emoji}
        </span>
      ))}
    </div>
  );
};

export const MessageReactions: React.FC<{
  reactions?: Reaction[];
  setReaction: (messageId: string, reaction?: string) => void;
  messageId: string;
  userId?: string;
}> = React.memo(({ reactions, userId, messageId, setReaction }) => {
  const groupedReactions = React.useMemo(() => {
    const groupedAsMap = new Map<string, { count: number; reactedBy: string[] }>();
    reactions?.forEach(reaction => {
      const { count, reactedBy } = groupedAsMap.get(reaction.reaction) || {
        count: 0,
        reactedBy: [],
      };
      groupedAsMap.set(reaction.reaction, {
        count: count + 1,
        reactedBy: reactedBy.concat(reaction.fromName),
      });
    });
    const reactionsAsArray = Array.from(groupedAsMap.entries());
    return reactionsAsArray.sort((a, b) => {
      const c = a[1].count - b[1].count;
      if (c !== 0) {
        return c;
      }
      return a[0] < b[0] ? -1 : 1;
    });
  }, [reactions]);
  const myReaction = React.useMemo(() => {
    return reactions?.find(x => x.fromid === userId);
  }, [reactions]);
  if (groupedReactions.length === 0) {
    return null;
  }
  return (
    <div className="flex justify-end gap-x-1">
      {groupedReactions?.map(([reaction, { count, reactedBy }]) => (
        <div
          key={reaction}
          title={reactedBy.length > 0 ? reactedBy.join("\n") : undefined}
          onClick={() => {
            myReaction?.reaction === reaction
              ? setReaction(messageId)
              : setReaction(messageId, reaction);
          }}
          className={classNames(
            "fog:text-body-m flex cursor-pointer items-center rounded border border-transparent py-0.5 pl-0.5 pr-1 leading-none",
            myReaction?.reaction === reaction
              ? "bg-blue-200 hover:border-blue-500"
              : "hover:border-blue-200"
          )}
        >
          <span className="pr-1">{reaction}</span>{" "}
          <span className="fog:text-body-s dark:text-white"> {count}</span>
        </div>
      ))}
    </div>
  );
});

export const EmojiPicker: React.FC<{
  cancelSelection: () => void;
  setReaction: (reaction: string) => void;
}> = ({ cancelSelection, setReaction }) => {
  const themeMode = useAtomValue(modeAtom);
  const [showPicker, setShowPicker] = React.useState(false);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(
    emojiPickerRef,
    () => {
      setShowPicker(false);
    },
    !showPicker
  );
  return (
    <>
      <span
        className="flex cursor-pointer px-1 text-gray-500 hover:text-gray-800 dark:hover:text-brand-red-500"
        onClick={() => {
          setShowPicker(!showPicker);
        }}
      >
        <Icons.EmojiSelect className="h-4 w-4" />
      </span>
      {showPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-7 right-0 z-10">
          <Picker
            theme={themeMode === "dark" ? Theme.DARK : Theme.LIGHT}
            onEmojiClick={emojiObject => {
              cancelSelection();
              setReaction(emojiObject.emoji);
              updateRecentEmojis(emojiObject.emoji);
            }}
          />
        </div>
      )}
    </>
  );
};
