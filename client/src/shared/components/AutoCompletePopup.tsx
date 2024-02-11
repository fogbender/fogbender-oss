import { type Author, type Room, useRoomMembers, useRoster } from "fogbender-proto";
import { filter } from "fuzzy";
import { atom, type WritableAtom, useAtom } from "jotai";
import { atomFamily, useAtomCallback, useAtomValue, useUpdateAtom } from "jotai/utils";
import React from "react";
import { throttle } from "throttle-debounce";

import { type AutocompleteItem, useRoomList } from "./useRoomList";

type State = string | undefined;

// to access autocomplete of one room
const roomAutocompleteFamily = atomFamily((_roomId: string) => atom<State>(undefined));
// stores selector index for a room
const roomSelectorFamily = atomFamily((_roomId: string) => atom(0));
// stores max selector index value for a room
const roomMaxSelectorFamily = atomFamily((_roomId: string) => atom(0));
// sets room that should be accepted with tab or enter key
const roomAcceptedIdFamily = atomFamily((_roomId: string) => atom(false));

const closeAutocomplete = (roomId: string) => {
  roomAutocompleteFamily.remove(roomId);
};

export const useCloseAutocompleteCallback = () => {
  // no need to use React.useCallback this way
  return closeAutocomplete;
};

export const useAutoCompleteUpdateFor = (roomId: string) => {
  const autocompleteAtom = roomAutocompleteFamily(roomId);
  return {
    readMentions: useAsyncAtomValue(autocompleteAtom),
    setMentions: useUpdateAtom(autocompleteAtom),
  };
};

const rosterCache = atom<{
  current: { [helpdeskId: string]: Room[] };
  merged: { [helpdeskId: string]: Room[] };
}>({ current: {}, merged: {} });

export const useRoomMentionDispatchFor = (roomId: string) => {
  type Actions = "up" | "down" | "enter_or_tab";
  const selectorAtom = roomSelectorFamily(roomId);
  const maxSelectorAtom = roomMaxSelectorFamily(roomId);
  const acceptedRoomAtom = roomAcceptedIdFamily(roomId);
  return useAtomCallback<void | "cant_accept", Actions>(
    React.useCallback(
      (get, set, update) => {
        const maxIndex = get(maxSelectorAtom);
        if (maxIndex === -1) {
          return "cant_accept";
        }
        if (update === "enter_or_tab") {
          set(acceptedRoomAtom, true);
          return;
        }
        const delta = update === "down" ? 1 : -1;
        let newIndex = get(selectorAtom) + delta;
        if (newIndex > maxIndex) {
          newIndex = 0;
        } else if (newIndex < 0) {
          newIndex = maxIndex;
        }
        set(selectorAtom, newIndex);
        return;
      },
      [acceptedRoomAtom, maxSelectorAtom, selectorAtom]
    )
  );
};

export function useAsyncAtomValue<V>(atom: WritableAtom<V, any>) {
  return useAtomCallback(React.useCallback(async get => get(atom), [atom]));
}

type onMentionAccepted = (id: string, text: string, command: string) => void;

export const MentionsPopup: React.FC<{
  isPrivate: boolean;
  userId: string;
  workspaceId: string | undefined;
  helpdeskId: string;
  roomId: string;
  hide: boolean;
  onMentionAccepted: onMentionAccepted;
  bottomOffset?: number;
  isAgent: boolean | undefined;
  myAuthor: Author;
}> = React.memo(props => {
  useAtom(rosterCache);
  const {
    isPrivate,
    userId,
    workspaceId,
    helpdeskId,
    roomId,
    hide,
    onMentionAccepted,
    bottomOffset,
    isAgent,
    myAuthor,
  } = props;
  const { filteredDialogs, setRosterFilter } = useRoster({
    userId,
    workspaceId,
    helpdeskId,
    roomId,
  });
  const searchString = useAtomValue(roomAutocompleteFamily(roomId));
  // TODO: do not hide mention picker if `hide` is `true` but window is out of focus
  if (hide || searchString === undefined) {
    return null;
  }

  return (
    <div
      className="fbr-scrollbar absolute bottom-12 left-0 right-12 z-10 mb-3.5 mr-0.5 max-h-40 overflow-y-auto rounded-t-md border border-blue-50 bg-white dark:bg-black dark:text-white"
      style={bottomOffset ? { bottom: bottomOffset } : {}}
      onPointerDown={e => {
        e.preventDefault();
      }}
    >
      <UserList
        isPrivate={isPrivate}
        searchString={searchString}
        userId={userId}
        filteredDialogs={filteredDialogs}
        setRosterFilter={setRosterFilter}
        roomId={roomId}
        helpdeskId={helpdeskId}
        onMentionAccepted={onMentionAccepted}
        isAgent={isAgent}
        myAuthor={myAuthor}
      />
    </div>
  );
});

const getName = (room: Room) => room.counterpart?.name || room.name;
const uId = (room: Room) => room.userId || room.agentId;

export const UserList: React.FC<{
  isPrivate: boolean;
  searchString: string;
  userId: string;
  filteredDialogs: Room[];
  setRosterFilter: (filter: string) => void;
  roomId: string;
  helpdeskId: string;
  onMentionAccepted: onMentionAccepted;
  isAgent: boolean | undefined;
  myAuthor: Author;
}> = React.memo(props => {
  const [cache, setCache] = useAtom(rosterCache);
  const {
    isPrivate,
    roomId,
    userId,
    helpdeskId,
    filteredDialogs,
    setRosterFilter,
    searchString,
    onMentionAccepted,
    isAgent,
    myAuthor,
  } = props;
  const [activateSelected, setActivateSelected] = useAtom(roomAcceptedIdFamily(roomId));
  const [selectorIndex, setSelectorIndex] = useAtom(roomSelectorFamily(roomId));
  const updateMaxSelector = useUpdateAtom(roomMaxSelectorFamily(roomId));

  const throttled = React.useMemo(
    () => throttle(500, (cb: (v: string) => void, v: string) => cb(v)),
    []
  );

  React.useEffect(() => {
    throttled(setRosterFilter, searchString);
  }, [searchString, setRosterFilter, throttled]);

  React.useEffect(() => {
    if (!cache.current[helpdeskId]) {
      cache.current[helpdeskId] = [];
    }

    if (!cache.merged[helpdeskId]) {
      cache.merged[helpdeskId] = [];
    }

    if (cache.current[helpdeskId] !== filteredDialogs) {
      cache.current[helpdeskId] = filteredDialogs;
      const newIds = filteredDialogs.map(uId);
      const merged = cache.merged[helpdeskId].filter(old => {
        return !newIds.includes(uId(old));
      });
      // uId null causes duplicates of two rooms with the same room.id (that is used as key)
      cache.merged[helpdeskId] = [...merged, ...filteredDialogs].filter(x => uId(x) !== null);
      setCache({ ...cache });
    }
  }, [cache, filteredDialogs, setCache]);

  const { rooms: roomMembers } = useRoomMembers({ roomId, userId });

  const userRoomsOriginal = isPrivate ? roomMembers : cache.merged[helpdeskId] || [];
  const selfRoom: Room | undefined = React.useMemo(
    () => ({
      msgType: "Event.Room",
      _meta: "roomT",
      counterpart: {
        id: userId,
        type: "agent",
        name: myAuthor.name,
        email: "",
        imageUrl: myAuthor.avatarUrl || "",
      },
      name: myAuthor.name,
      displayNameForUser: null,
      displayNameForAgent: null,
      status: "active",
      type: "dialog",
      id: "",
      agentId: "",
      createdTs: 0,
      customerId: "",
      customerName: "It’s you!",
      created: false,
      email: "",
      helpdeskId,
      imageUrl: "",
      updatedTs: 0,
      userId: "",
      vendorId: "",
      workspaceId: "",
      resolved: false,
      resolvedAt: null,
      resolvedByAgentId: null,
      resolvedTil: null,
      lastMessage: null,
      relevantMessage: null,
      createdBy: null,
      commands: [],
      defaultGroupAssignment: null,
    }),
    [helpdeskId, userId]
  );

  const [roomIdToExpand, setRoomIdToExpand] = React.useState<string>();

  const expandCommands = searchString.length > 0;

  // we need to turn rooms into rooms+commands
  const autocompleteItems = React.useMemo(() => {
    const userRooms =
      selfRoom && isAgent ? userRoomsOriginal.concat([selfRoom]) : userRoomsOriginal;

    const items: AutocompleteItem[] = [];
    userRooms.forEach(room => {
      const commands = room.commands;
      items.push({ kind: "room", id: room.id, room });
      if (commands && (expandCommands || roomIdToExpand === room.id)) {
        commands.forEach(command => {
          items.push({ kind: "command", id: `${room.id}-${command}`, room, command });
        });
      }
    });

    return filter(searchString, items, {
      pre: "<",
      post: ">",
      extract: item => {
        const { room } = item;
        return item.kind === "command"
          ? `${room.name} ${item.command}`
          : `${room.name} ${room.customerName}`;
      },
    }).map(({ original /* `string` will have matched parts of word highlighted */ }) => original);
  }, [expandCommands, isAgent, roomIdToExpand, searchString, selfRoom, userRoomsOriginal]);

  const selectedItems = React.useMemo(() => {
    const item = autocompleteItems[selectorIndex];
    if (item) {
      return { [item.id]: true };
    } else {
      return;
    }
  }, [autocompleteItems, selectorIndex]);

  const onItemAccepted = React.useCallback(
    (item: AutocompleteItem) => {
      const { room } = item;
      const command = item.kind === "command" ? " " + item.command : "";
      const commands = room.commands;
      const expand = expandCommands || roomIdToExpand === room.id;
      if (!expand && item.kind === "room" && commands) {
        setRoomIdToExpand(item.room.id);
        return;
      }
      if (room?.counterpart) {
        onMentionAccepted(room.counterpart.id, getName(room), command);
      }
    },
    [expandCommands, onMentionAccepted, roomIdToExpand]
  );

  React.useEffect(() => {
    if (activateSelected) {
      const item = autocompleteItems[selectorIndex];
      if (item) {
        onItemAccepted(item);
      }
      setActivateSelected(false);
    }
  }, [activateSelected, autocompleteItems, onItemAccepted, selectorIndex, setActivateSelected]);

  const autocompleteList = useRoomList({
    autocompleteItems,
    userId,
    onItemClick: onItemAccepted,
    selectedItems,
  });
  const itemsCount = autocompleteItems.length;
  const maxSelector = itemsCount - 1;
  React.useEffect(() => {
    updateMaxSelector(maxSelector);
  }, [maxSelector, updateMaxSelector]);
  const selectorIndexOverflow = selectorIndex > maxSelector;
  React.useEffect(() => {
    if (selectorIndexOverflow) {
      setSelectorIndex(0);
    }
  }, [selectorIndexOverflow, setSelectorIndex]);
  return <React.Fragment>{autocompleteList}</React.Fragment>;
});
