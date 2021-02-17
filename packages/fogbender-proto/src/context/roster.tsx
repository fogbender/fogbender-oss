import { atom } from "jotai";
import { useImmerAtom } from "jotai/immer";
import React from "react";

import {
  EventRoom,
  EventTag,
  IntegrationCreateIssue,
  IntegrationForwardToIssue,
  RoomCreate,
  RoomUpdate,
  SearchRoster,
} from "../schema";

import { eventRoomToRoom, Room } from "./sharedRoster";
import { useWs } from "./ws";

import { useRejectIfUnmounted } from "../utils/useRejectIfUnmounted";
import { extractEventTag } from "../utils/castTypes";

export type { Room } from "./sharedRoster";

function useImmer<T>(initialValue: T) {
  return useImmerAtom(React.useRef(atom(initialValue)).current);
}

export const useRoster = ({
  workspaceId,
  helpdeskId,
  userId,
  roomId, // for mentions
}: {
  workspaceId?: string;
  helpdeskId?: string;
  userId?: string;
  roomId?: string;
}) => {
  const { sharedRoster, serverCall } = useWs();
  const {
    roster,
    roomById,
    roomByName,
    badges,
    customers,
    seenRoster,
    setSeenRoster,
  } = sharedRoster;

  /*
    API calls work independently for each hook
  */

  const createRoom = React.useCallback(
    (
      params: Pick<
        RoomCreate,
        | "name"
        | "type"
        | "members"
        | "helpdeskId"
        | "tags"
        | "linkRoomId"
        | "linkStartMessageId"
        | "linkEndMessageId"
        | "meta"
      >
    ) =>
      serverCall<RoomCreate>({
        msgType: "Room.Create",
        name: params.name,
        type: params.type,
        members: params.members,
        helpdeskId: params.helpdeskId,
        tags: params.tags,
        meta: params.meta,
        linkRoomId: params.linkRoomId,
        linkStartMessageId: params.linkStartMessageId,
        linkEndMessageId: params.linkEndMessageId,
      }).then(x => {
        console.assert(x.msgType === "Room.Ok");
        setSeenRoster(roster => ({ ...roster, [Date.now() * 1000]: x }));
        return x;
      }),
    [serverCall]
  );

  const updateRoom = React.useCallback(
    (
      params: Pick<
        RoomUpdate,
        "roomId" | "name" | "membersToAdd" | "membersToRemove" | "tagsToAdd" | "tagsToRemove"
      >
    ) =>
      serverCall<RoomUpdate>({
        msgType: "Room.Update",
        roomId: params.roomId,
        name: params.name,
        membersToAdd: params.membersToAdd,
        membersToRemove: params.membersToRemove,
        tagsToAdd: params.tagsToAdd,
        tagsToRemove: params.tagsToRemove,
      }).then(x => {
        console.assert(x.msgType === "Room.Ok");
        return x;
      }),
    [serverCall]
  );

  const createIssue = React.useCallback(
    (
      params: Pick<
        IntegrationCreateIssue,
        "integrationId" | "title" | "linkRoomId" | "linkStartMessageId" | "linkEndMessageId"
      >
    ) =>
      serverCall<IntegrationCreateIssue>({
        msgType: "Integration.CreateIssue",
        integrationId: params.integrationId,
        title: params.title,
        linkRoomId: params.linkRoomId,
        linkStartMessageId: params.linkStartMessageId,
        linkEndMessageId: params.linkEndMessageId,
      }).then(x => {
        console.assert(x.msgType === "Integration.Ok");
        return x;
      }),
    [serverCall]
  );

  const forwardToIssue = React.useCallback(
    (
      params: Pick<
        IntegrationForwardToIssue,
        "integrationId" | "issueId" | "linkRoomId" | "linkStartMessageId" | "linkEndMessageId"
      >
    ) =>
      serverCall<IntegrationForwardToIssue>({
        msgType: "Integration.ForwardToIssue",
        integrationId: params.integrationId,
        issueId: params.issueId,
        linkRoomId: params.linkRoomId,
        linkStartMessageId: params.linkStartMessageId,
        linkEndMessageId: params.linkEndMessageId,
      }).then(x => {
        console.assert(x.msgType === "Integration.Ok");
        return x;
      }),
    [serverCall]
  );

  /*
    Search roster -- works independently for each hook
  */

  const [rosterFilter, setRosterFilter] = React.useState<string>();
  const [filteredRoster, setFilteredRoster] = React.useState([] as Room[]);
  const filteredRooms = React.useMemo(() => filteredRoster.filter(x => x.type !== "dialog"), [
    filteredRoster,
  ]);
  const filteredDialogs = React.useMemo(() => filteredRoster.filter(x => x.type === "dialog"), [
    filteredRoster,
  ]);

  const filterNotMonolog = (rooms: Room[]) =>
    rooms
      .filter(x => x.counterpart?.id !== userId)
      .filter(
        x =>
          x.type !== "dialog" ||
          !x.members ||
          x.members.length === 0 ||
          !x.members.every(y => y.id === userId)
      );

  React.useEffect(() => {
    if (userId && roomId && rosterFilter !== undefined) {
      serverCall<SearchRoster>({
        msgType: "Search.Roster",
        workspaceId,
        helpdeskId,
        mentionRoomId: roomId,
        term: rosterFilter,
        type: "dialog",
      }).then(x => {
        if (x.msgType !== "Search.Ok") {
          throw x;
        }
        setFilteredRoster(filterNotMonolog(x.items.map(y => eventRoomToRoom(y, userId))));
      });
    } else if (userId && workspaceId && rosterFilter) {
      serverCall<SearchRoster>({
        msgType: "Search.Roster",
        workspaceId,
        term: rosterFilter,
      }).then(x => {
        if (x.msgType !== "Search.Ok") {
          throw x;
        }
        setFilteredRoster(filterNotMonolog(x.items.map(y => eventRoomToRoom(y, userId))));
      });
    } else if (userId && helpdeskId && rosterFilter) {
      serverCall<SearchRoster>({
        msgType: "Search.Roster",
        helpdeskId,
        term: rosterFilter,
      }).then(x => {
        if (x.msgType !== "Search.Ok") {
          throw x;
        }
        setFilteredRoster(filterNotMonolog(x.items.map(y => eventRoomToRoom(y, userId))));
      });
    } else if (userId && !rosterFilter) {
      setFilteredRoster(filterNotMonolog(roster.map(y => eventRoomToRoom(y, userId))));
    }
  }, [userId, roster, customers, rosterFilter, serverCall]);

  return {
    roster,
    seenRoster,
    roomById,
    roomByName,
    filteredRoster,
    filteredRooms,
    filteredDialogs,
    setRosterFilter,
    createRoom,
    updateRoom,
    createIssue,
    forwardToIssue,
    customers,
    badges,
  };
};

export const useRoomMembers = ({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string | undefined;
}) => {
  const { token, serverCall, lastIncomingMessage } = useWs();
  const rejectIfUnmounted = useRejectIfUnmounted();
  const [rooms, setRooms] = useImmer<Room[]>([]);
  const [roomUpdate, setRoomUpdate] = useImmer<EventRoom | undefined>(undefined);

  React.useEffect(() => {
    if (userId && lastIncomingMessage?.msgType === "Event.Room") {
      if (lastIncomingMessage.id === roomId) {
        setRoomUpdate(() => {
          return lastIncomingMessage;
        });
      }
    }
  }, [lastIncomingMessage]);

  React.useEffect(() => {
    if (userId && token) {
      serverCall({
        msgType: "Search.Members",
        roomId,
      })
        .then(rejectIfUnmounted)
        .then(x => {
          if (x.msgType !== "Search.Ok") {
            throw x;
          }
          setRooms(y => {
            const len = y.length;

            for (let i = 0; i < len; i++) {
              y.shift();
            }

            x.items.forEach(q => {
              const r = eventRoomToRoom(q, userId);
              y.push(r);
            });
          });
        })
        .catch(() => {});
    }
  }, [roomUpdate, roomId, token, serverCall]);

  return { rooms };
};

export const useUserTags = ({ userId }: { userId: string | undefined }) => {
  const { token, serverCall, lastIncomingMessage, helpdesk } = useWs();
  const rejectIfUnmounted = useRejectIfUnmounted();

  const [tags, setTags] = React.useState<{ id: string; name: string }[]>([]);

  const updateTags = React.useCallback(
    (tagsIn: EventTag[]) => {
      let newTags = tags;
      tagsIn.forEach(tag => {
        newTags = newTags.filter(x => x.id !== tag.id);
        if (!tag.remove) {
          newTags.push({ id: tag.id, name: tag.name });
        }
      });
      setTags(newTags);
    },
    [tags]
  );

  React.useEffect(() => {
    if (userId && lastIncomingMessage?.msgType === "Event.Tag") {
      updateTags([lastIncomingMessage]);
    }
  }, [lastIncomingMessage]);

  React.useEffect(() => {
    if (userId && userId.startsWith("u") && token) {
      const topic = `user/${userId}/tags`;
      serverCall({
        msgType: "Stream.Get",
        topic,
      })
        .then(rejectIfUnmounted)
        .then(x => {
          if (x.msgType !== "Stream.GetOk") {
            throw x;
          }
          updateTags(extractEventTag(x.items));
        })
        .catch(() => {});

      serverCall({
        msgType: "Stream.Sub",
        topic,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });
    }
  }, [userId, token, serverCall]);

  React.useEffect(() => {
    return () => {
      if (userId && userId.startsWith("u") && token) {
        serverCall({
          msgType: "Stream.UnSub",
          topic: `user/${userId}/tags`,
        }).then(x => {
          console.assert(x.msgType === "Stream.UnSubOk");
        });
      }
    };
  }, [userId, serverCall]);

  return { tags, helpdeskTags: helpdesk?.tags || [] };
};
