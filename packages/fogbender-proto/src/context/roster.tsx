import { atom } from "jotai";
import { useImmerAtom } from "jotai/immer";
import React from "react";

import type {
  EventRoom,
  EventTag,
  EventUser,
  IntegrationCreateIssue,
  IntegrationCreateIssueWithForward,
  IntegrationForwardToIssue,
  IntegrationLabelIssue,
  RoomCreate,
  RoomArchive,
  RoomUnarchive,
  UserUpdate,
  SearchRoster,
  StreamGet,
} from "../schema";

import type { Room } from "./sharedRoster";
import { Author, useWs, useWsCalls } from "./ws";

import { useRejectIfUnmounted } from "../utils/useRejectIfUnmounted";
import { extractEventRoom, extractEventTag, extractEventUser } from "../utils/castTypes";
import { eventRoomToRoom } from "../utils/counterpart";

export type { Room } from "./sharedRoster";

function useImmer<T>(initialValue: T) {
  return useImmerAtom(React.useRef(atom(initialValue)).current);
}

export function useAuthorEmail(author: Author) {
  const { serverCall } = useWs();
  const [email, setEmail] = React.useState<string>();
  React.useEffect(() => {
    if (email === undefined && ["agent", "user"].includes(author.type)) {
      serverCall({
        msgType: "Search.AuthorEmail",
        authorId: author.id,
        type: author.type,
        workspaceId: "",
      }).then(x => {
        if (x.msgType !== "Search.Ok") {
          console.error(x);
          return;
        }
        setEmail(x.items[0].email);
      });
    }
  }, [author, email, serverCall]);

  return email;
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
  const { sharedRoster, serverCall, userAvatarUrl } = useWs();
  const {
    roster: fullRoster,
    roomById,
    badges,
    customers,
    seenRoster,
    setSeenRoster,
  } = sharedRoster;

  const [roster, setRoster] = React.useState([] as Room[]);

  React.useMemo(
    () => setRoster(helpdeskId ? fullRoster.filter(x => x.helpdeskId === helpdeskId) : fullRoster),
    [fullRoster]
  );

  /*
    API calls work independently for each hook
  */

  const { updateRoom } = useWsCalls();

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

  const archiveRoom = React.useCallback(
    (params: Pick<RoomArchive, "roomId">) =>
      serverCall<RoomArchive>({
        msgType: "Room.Archive",
        roomId: params.roomId,
      }).then(x => {
        console.assert(x.msgType === "Room.Ok");
        return x;
      }),
    [serverCall]
  );

  const unarchiveRoom = React.useCallback(
    (params: Pick<RoomUnarchive, "roomId">) =>
      serverCall<RoomUnarchive>({
        msgType: "Room.Unarchive",
        roomId: params.roomId,
      }).then(x => {
        console.assert(x.msgType === "Room.Ok");
        return x;
      }),
    [serverCall]
  );

  const updateUser = React.useCallback(
    (params: Pick<UserUpdate, "userId" | "imageUrl">) =>
      serverCall<UserUpdate>({
        msgType: "User.Update",
        userId: params.userId,
        imageUrl: params.imageUrl,
      }).then(x => {
        console.assert(x.msgType === "User.Ok");
        return x;
      }),
    [serverCall]
  );

  const createIssueWithForward = React.useCallback(
    (
      params: Pick<
        IntegrationCreateIssueWithForward,
        "integrationProjectId" | "title" | "linkRoomId" | "linkStartMessageId" | "linkEndMessageId"
      >
    ) =>
      workspaceId !== undefined
        ? serverCall<IntegrationCreateIssueWithForward>({
            msgType: "Integration.CreateIssueWithForward",
            workspaceId,
            integrationProjectId: params.integrationProjectId,
            title: params.title,
            linkRoomId: params.linkRoomId,
            linkStartMessageId: params.linkStartMessageId,
            linkEndMessageId: params.linkEndMessageId,
          }).then(x => {
            console.assert(x.msgType === "Integration.Ok");
            return x;
          })
        : null,
    [serverCall, workspaceId]
  );

  const createIssue = React.useCallback(
    (params: Pick<IntegrationCreateIssue, "integrationProjectId" | "title" | "roomId">) =>
      workspaceId !== undefined
        ? serverCall<IntegrationCreateIssue>({
            msgType: "Integration.CreateIssue",
            workspaceId,
            integrationProjectId: params.integrationProjectId,
            title: params.title,
            roomId: params.roomId,
          }).then(x => {
            console.assert(x.msgType === "Integration.Ok");
            return x;
          })
        : null,
    [serverCall, workspaceId]
  );

  const forwardToIssue = React.useCallback(
    (
      params: Pick<
        IntegrationForwardToIssue,
        | "integrationProjectId"
        | "issueId"
        | "linkRoomId"
        | "linkStartMessageId"
        | "linkEndMessageId"
      >
    ) =>
      workspaceId !== undefined
        ? serverCall<IntegrationForwardToIssue>({
            msgType: "Integration.ForwardToIssue",
            workspaceId,
            integrationProjectId: params.integrationProjectId,
            issueId: params.issueId,
            linkRoomId: params.linkRoomId,
            linkStartMessageId: params.linkStartMessageId,
            linkEndMessageId: params.linkEndMessageId,
          }).then(x => {
            console.assert(x.msgType === "Integration.Ok");
            return x;
          })
        : null,
    [serverCall, workspaceId]
  );

  const labelIssue = React.useCallback(
    (params: Pick<IntegrationLabelIssue, "integrationProjectId" | "issueId">) =>
      workspaceId !== undefined
        ? serverCall<IntegrationLabelIssue>({
            msgType: "Integration.LabelIssue",
            workspaceId,
            integrationProjectId: params.integrationProjectId,
            issueId: params.issueId,
          }).then(x => {
            console.assert(x.msgType === "Integration.Ok");
            return x;
          })
        : null,
    [serverCall, workspaceId]
  );

  /*
    Search roster -- works independently for each hook
  */

  const [rosterFilter, setRosterFilter] = React.useState<string>();
  const [filteredRoster, setFilteredRoster] = React.useState([] as Room[]);
  const filteredRooms = React.useMemo(
    () => filteredRoster.filter(x => x.type !== "dialog"),
    [filteredRoster]
  );
  const filteredDialogs = React.useMemo(
    () => filteredRoster.filter(x => x.type === "dialog"),
    [filteredRoster]
  );

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

  const roomsByTags = React.useCallback(
    (tagIds: string[]) =>
      serverCall<SearchRoster>({
        msgType: "Search.Roster",
        workspaceId,
        helpdeskId,
        mentionRoomId: roomId,
        tagIds,
      }).then(x => {
        console.assert(x.msgType === "Search.Ok");
        if (x.msgType === "Search.Ok") {
          return x.items;
        } else {
          return [];
        }
      }),
    [serverCall]
  );

  return {
    roster,
    seenRoster,
    roomById,
    filteredRoster,
    filteredRooms,
    filteredDialogs,
    setRosterFilter,
    createRoom,
    updateRoom,
    archiveRoom,
    unarchiveRoom,
    updateUser,
    createIssue,
    createIssueWithForward,
    forwardToIssue,
    labelIssue,
    customers,
    badges,
    roomsByTags,
    userAvatarUrl,
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

export const useHelpdeskRooms = ({ helpdeskId }: { helpdeskId: string | undefined }) => {
  const { token, serverCall, lastIncomingMessage } = useWs();

  const [rooms, setRooms] = React.useState<EventRoom[]>([]);

  const updateRooms = React.useCallback(
    (roomsIn: EventRoom[]) => {
      let newRooms = rooms;
      roomsIn.forEach(room => {
        newRooms = newRooms.filter(x => x.id !== room.id);
        newRooms.push(room);
      });
      setRooms(newRooms);
    },
    [rooms]
  );

  React.useEffect(() => {
    if (helpdeskId && lastIncomingMessage?.msgType === "Event.Room") {
      updateRooms([lastIncomingMessage]);
    }
  }, [lastIncomingMessage]);

  React.useEffect(() => {
    if (helpdeskId && token) {
      const topic = `helpdesk/${helpdeskId}/rooms`;
      serverCall<StreamGet>({
        msgType: "Stream.Get",
        limit: 100,
        topic,
      })
        .then(x => {
          if (x.msgType !== "Stream.GetOk") {
            throw x;
          }
          updateRooms(extractEventRoom(x.items));
        })
        .catch(() => {});

      serverCall({
        msgType: "Stream.Sub",
        topic,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });
    }
  }, [helpdeskId, token, serverCall]);

  React.useEffect(() => {
    return () => {
      if (helpdeskId && token) {
        serverCall({
          msgType: "Stream.UnSub",
          topic: `helpdesk/${helpdeskId}/rooms`,
        }).then(x => {
          console.assert(x.msgType === "Stream.UnSubOk");
        });
      }
    };
  }, [helpdeskId, serverCall]);

  return { rooms };
};

export const useHelpdeskUsers = ({ helpdeskId }: { helpdeskId: string | undefined }) => {
  const { token, serverCall, lastIncomingMessage } = useWs();
  const rejectIfUnmounted = useRejectIfUnmounted();

  const [users, setUsers] = React.useState<EventUser[]>([]);

  const updateUsers = React.useCallback(
    (usersIn: EventUser[]) => {
      let newUsers = users;
      usersIn.forEach(user => {
        newUsers = newUsers.filter(x => x.userId !== user.userId);
        newUsers.push(user);
      });
      setUsers(newUsers);
    },
    [users]
  );

  React.useEffect(() => {
    if (helpdeskId && lastIncomingMessage?.msgType === "Event.User") {
      updateUsers([lastIncomingMessage]);
    }
  }, [lastIncomingMessage]);

  React.useEffect(() => {
    if (helpdeskId && token) {
      const topic = `helpdesk/${helpdeskId}/users`;
      serverCall({
        msgType: "Stream.Get",
        topic,
      })
        .then(rejectIfUnmounted)
        .then(x => {
          if (x.msgType !== "Stream.GetOk") {
            throw x;
          }
          updateUsers(extractEventUser(x.items));
        })
        .catch(() => {});

      serverCall({
        msgType: "Stream.Sub",
        topic,
      }).then(x => {
        console.assert(x.msgType === "Stream.SubOk");
      });
    }
  }, [helpdeskId, token, serverCall]);

  React.useEffect(() => {
    return () => {
      if (helpdeskId && token) {
        serverCall({
          msgType: "Stream.UnSub",
          topic: `helpdesk/${helpdeskId}/users`,
        }).then(x => {
          console.assert(x.msgType === "Stream.UnSubOk");
        });
      }
    };
  }, [helpdeskId, serverCall]);

  return { users };
};
