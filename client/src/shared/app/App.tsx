import classNames from "classnames";
import { ResizeSensor } from "css-element-queries";
import {
  Author,
  EventRoom,
  getVersion,
  Integration as IntegrationT,
  isEventUser,
  Room as RoomT,
  Tag as TagT,
  useLoadAround,
  useRoster,
  useRosterActions,
  useSharedRoster,
  useUserTags,
  useWs,
} from "fogbender-proto";
import { useAtom } from "jotai";
import React from "react";
import ReactGridLayout, { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useCloseAutocompleteCallback } from "../components/AutoCompletePopup";
import { GoFullScreen, handleGoFullScreen } from "../components/GoFullScreen";
import { Icons } from "../components/Icons";
import { FogbenderLogo } from "../components/IntegrationIcons";
import {
  Avatar,
  ConnectionIssue,
  FilterInput,
  NotificationsPermissionRequest,
  RecentUnreadCircle,
  UnreadCircle,
} from "../components/lib";
import { Modal } from "../components/Modal";
import {
  hideWelcomeAtom,
  modeAtom,
  muteNotificationsAtom,
  showOutlookRosterAtom,
} from "../store/config.store";
import { Agent, AuthorMe, VendorBilling } from "../types";
import { isExternalHelpdesk, isInternalHelpdesk, roomToName } from "../utils/format";
import { LocalStorageKeys } from "../utils/LocalStorageKeys";
import { SafeLocalStorage } from "../utils/SafeLocalStorage";
import { useClickOutside } from "../utils/useClickOutside";
import { useDebug } from "../utils/useDebug";
import { useFavicon } from "../utils/useFavicon";
import {
  isIframe,
  useAgentNotifications,
  useClientNotifications,
  useOnNotifications,
} from "../utils/useNotifications";
import { usePrevious } from "../utils/usePrevious";

import { CreateRoom } from "./CreateRoom";
import { RenderCustomerInfoCb } from "./CustomerInfo";
import { CustomerInfoPane } from "./CustomerInfoPane";
import { Customers } from "./Customers";
import { EmailNotificationsSettings } from "./EmailNotificationsSettings";
import { Folders } from "./Folders";
import { IssueInfoPane } from "./IssueInfoPane";
import { LayoutOptions } from "./LayoutOptions";
import { Room } from "./Room";
import { RoomNameLine } from "./RoomHeader";
import { RoomSettings } from "./RoomSettings";
import { Roster } from "./Roster";
import { RosterMenu } from "./RosterMenu";
import { Search } from "./Search";
import { Roster as OldRoster } from "./SearchRoster";
import { SectionRoster } from "./SectionRoster";
import { RenderUsersInfoCb } from "./UsersInfo";
import { UsersInfoPane } from "./UsersInfoPane";
import { Welcome } from "./Welcome";

// tslint:disable-next-line:ordered-imports

type Layout = ReactGridLayout.Layout;

const ResponsiveReactGridLayout = WidthProvider(Responsive);

export const App: React.FC<{
  isIdle: boolean;
  authorMe: AuthorMe | undefined;
  agents?: Agent[];
  billing?: VendorBilling;
  openFromLocationHook?: (roomById: (id: string) => RoomT | undefined) => void | undefined;
  workspaceTags?: TagT[];
  workspaceIntegrations?: IntegrationT[];
  notificationsPermission?: NotificationPermission | "hide" | "request";
  setNotificationsPermission?: (
    notificationsPermission: NotificationPermission | "hide" | "request"
  ) => void;
  roomIdToOpen?: string | undefined;
  setRoomIdToOpen?: (roomId: string) => void;
  renderCustomerInfoPane?: RenderCustomerInfoCb;
  renderUsersInfoPane?: RenderUsersInfoCb;
}> = ({
  authorMe,
  billing,
  agents,
  openFromLocationHook,
  workspaceTags,
  workspaceIntegrations,
  notificationsPermission,
  setNotificationsPermission,
  roomIdToOpen,
  setRoomIdToOpen,
  renderCustomerInfoPane,
  renderUsersInfoPane,
  isIdle,
}) => {
  const [mode, setMode] = useAtom(modeAtom);
  const {
    agentRole,
    avatarLibraryUrl,
    isAgent,
    userType,
    isAuthenticated,
    isConnected,
    isTokenWrong,
    userId: ourId,
    userAvatarUrl,
    workspaceId,
    helpdeskId,
    helpdesk,
    token,
    serverCall,
    visitorJWT,
  } = useWs();
  useDebug("serverCall", serverCall);

  const isUser = !isAgent;

  const { vendorId } = token !== undefined && "vendorId" in token ? token : { vendorId: undefined };

  const myAuthor = React.useMemo(() => {
    const author: Author = {
      type: isAgent ? "agent" : "user",
      userType,
      id: ourId || "",
      name: authorMe?.name || "",
      avatarUrl: userAvatarUrl || authorMe?.avatarUrl,
    };
    return author;
  }, [authorMe, ourId, isAgent, userType, userAvatarUrl]);

  const version = getVersion();

  const [disconnectCounter, setDisconnectCounter] = React.useState<number>();
  React.useEffect(() => {
    if (!isConnected) {
      setActiveRoomId(undefined);
      setDisconnectCounter(x => (x === undefined ? 0 : x + 1));
    }
  }, [isConnected]);

  const { badges, customers, roster, roomById } = useSharedRoster();
  const { createRoom, updateUser } = useRosterActions({ workspaceId, helpdeskId });
  const { filteredRoster } = useRoster({
    userId: ourId,
    workspaceId,
    helpdeskId,
  }); // Subscribe to events

  const [rosterSearch, setRosterSearch] = React.useState("");
  const searchString = rosterSearch.trim().toLowerCase();
  const searching = searchString.length > 0;

  const sortedDoubleFilteredRoster = React.useMemo(
    () => filterRosterRooms(filteredRoster, isAgent),
    [filteredRoster, isAgent]
  );

  openFromLocationHook?.(roomById);
  const tryOpenRoomLayoutOpts = React.useRef(new Map<string, LayoutOptions>());
  const { loadAround, updateLoadAround } = useLoadAround();
  const prevLoadAround = usePrevious(loadAround);

  const [waitForRoomToOpen, setWaitForRoomToOpen] = React.useState<string>();

  function rosterInputSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (rosterSearch && filteredRoster.length > 0) {
      tryOpenRoom(filteredRoster[0]);
    }
  }

  const { initialLayout, initialLayoutPins, storeLayout } = useLayoutLocalStorage(
    workspaceId || helpdeskId
  );

  const [layout, setLayout] = React.useState<Layout[]>([]);
  const [layoutPins, setLayoutPins] = React.useState<string[]>([]);
  const [layoutInitialized, setLayoutInitialized] = React.useState(false);

  React.useEffect(() => setLayoutPins(initialLayoutPins), [initialLayoutPins]);

  const saveLayout = React.useCallback(
    (layout: Layout[]) => {
      setLayout(layout);
      storeLayout(layout, layoutPins);
    },
    [storeLayout, layoutPins]
  );

  const [maxCols, setMaxCols] = React.useState(1);
  const [maxRows, setMaxRows] = React.useState(1);
  const [rowHeight, setRowHeight] = React.useState(420);

  const [singleRoomMode, setSingleRoomMode] = React.useState(false);
  React.useEffect(() => {
    setSingleRoomMode(() => isAgent === false && maxCols === 1 && maxRows === 1);
  }, [isAgent, maxCols, maxRows]);

  const openRoomIds: string[] = React.useMemo(() => {
    return layout.sort((a, b) => a.y * maxCols + a.x - (b.y * maxCols + b.x)).map(x => x.i);
  }, [layout, maxCols]);

  const [activeRoomId, setActiveRoomId] = React.useState<string>();
  const [resizingRoomId, setResizingRoomId] = React.useState<string>();

  const closeRooms = React.useCallback((roomIds: string[], layout: Layout[]) => {
    let newLayout = layout;
    roomIds.forEach(roomId => {
      newLayout = newLayout.filter(x => x.i !== roomId);
    });
    setActiveRoomId(undefined);
    setLayoutPins(pins => pins.filter(x => !roomIds.includes(x)));
    return newLayout;
  }, []);

  const addItem = React.useCallback(
    (roomId: string, layoutIn: Layout[]): Layout[] => {
      if (layoutIn.length === 0) {
        return [
          {
            i: roomId,
            x: 0,
            y: 0,
            w: maxCols,
            h: maxRows,
            minW: 1,
          },
        ];
      }

      const cells = Array(maxCols * maxRows);
      let maxAreaRoom: Layout | undefined;
      let maxAreaPinnedRoom: Layout | undefined;

      let layout = layoutIn.sort((a, b) =>
        a.x === b.x && a.y === b.y ? 0 : a.x > b.x || a.y > b.y ? 1 : -1
      );
      let x = 0;
      let y = 0;

      if (activeRoomId) {
        const idx = layout.findIndex(x => x.i === activeRoomId);
        layout = layout.slice(idx + 1).concat(layout.slice(0, idx + 1));
      }

      layout.forEach(room => {
        const isPinned = layoutPins.includes(room.i);
        if (
          !isPinned &&
          (maxAreaRoom === undefined || maxAreaRoom.w * maxAreaRoom.h < room.w * room.h)
        ) {
          maxAreaRoom = room;
        }
        if (
          isPinned &&
          (maxAreaPinnedRoom === undefined ||
            maxAreaPinnedRoom.w * maxAreaPinnedRoom.h < room.w * room.h)
        ) {
          maxAreaPinnedRoom = room;
        }
        for (let i = 0; i < room.w; i++) {
          for (let j = 0; j < room.h; j++) {
            cells[room.x + i + (room.y + j) * maxCols] = room.i;
          }
        }
      });

      if (!maxAreaRoom && maxAreaPinnedRoom) {
        maxAreaRoom = maxAreaPinnedRoom;
      }

      const idx = cells.findIndex(x => !x);

      if (idx >= 0) {
        x = idx % maxCols;
        y = Math.floor(idx / maxCols);
      } else if (idx === -1 && maxAreaRoom) {
        if (maxAreaRoom.w > 1) {
          maxAreaRoom.w = maxAreaRoom.w - 1;
          layout = layout.map(room =>
            maxAreaRoom &&
            room.x > maxAreaRoom.x &&
            room.y >= maxAreaRoom.y &&
            room.y < maxAreaRoom.y + maxAreaRoom.h
              ? { ...room, x: room.x - 1 }
              : room
          );
          return addItem(roomId, layout);
        } else if (maxAreaRoom.h > 1) {
          maxAreaRoom.h = maxAreaRoom.h - 1;
          layout = layout.map(room =>
            maxAreaRoom &&
            room.y > maxAreaRoom.y &&
            room.x >= maxAreaRoom.x &&
            room.x < maxAreaRoom.x + maxAreaRoom.w
              ? { ...room, y: room.y - 1 }
              : room
          );
          return addItem(roomId, layout);
        } else {
          layout = closeRooms([maxAreaRoom.i], layout);
          x = maxAreaRoom.x;
          y = maxAreaRoom.y;
        }
      }

      return layout.concat({
        i: roomId,
        x,
        y,
        w: 1,
        h: 1,
        minW: 1,
      });
    },

    [maxCols, maxRows, closeRooms, activeRoomId]
  );

  const onAddItem = React.useCallback(
    (roomId: string) => {
      const opts = tryOpenRoomLayoutOpts.current.get(roomId);
      tryOpenRoomLayoutOpts.current.delete(roomId);
      const oldLayout = opts?.forceFullscreen ? [] : layout;
      const newLayout = addItem(roomId, oldLayout);
      saveLayout(newLayout);
    },
    [addItem, layout, saveLayout]
  );

  const tryOpenRoom = React.useCallback(
    (room: EventRoom) => {
      if (room.created === true) {
        if (!openRoomIds.includes(room.id)) {
          onAddItem(room.id);
        }
        setActiveRoomId(room.id);
      } else if (room.created === false && ourId && room.type === "dialog") {
        const counterpartId = room.agentId || room.userId;

        if (counterpartId) {
          createRoom({
            helpdeskId: room.helpdeskId,
            type: "dialog",
            members: [ourId, counterpartId],
          }).then(x => {
            if (x.msgType !== "Room.Ok") {
              throw x;
            }
            setWaitForRoomToOpen(x.roomId);
          });
        }
      }
    },
    [ourId, createRoom, openRoomIds, onAddItem]
  );

  const onOpenSearch = React.useCallback(
    (roomId: string) => {
      const searchRoomId = "search-" + roomId;
      if (!openRoomIds.includes(searchRoomId)) {
        onAddItem(searchRoomId);
      }
      setActiveRoomId(searchRoomId);
    },
    [openRoomIds, onAddItem]
  );

  const onOpenDialog = React.useCallback(
    (dialogUserId: string, dialogHelpdeskId: string) => {
      if (ourId) {
        createRoom({
          helpdeskId: dialogHelpdeskId,
          type: "dialog",
          members: [ourId, dialogUserId],
        }).then(x => {
          if (x.msgType !== "Room.Ok") {
            throw x;
          }
          setWaitForRoomToOpen(x.roomId);
        });
      }
    },
    [ourId, helpdeskId]
  );

  React.useEffect(() => {
    if (waitForRoomToOpen) {
      const roomToOpen = roomById(waitForRoomToOpen);
      if (roomToOpen) {
        setWaitForRoomToOpen(undefined);
        requestAnimationFrame(() => tryOpenRoom(roomToOpen));
      }
    }
  }, [waitForRoomToOpen, tryOpenRoom, roomById]);

  const [showIssueInfo, setShowIssueInfo] = React.useState<TagT>();

  const onShowIssueInfo = React.useCallback((tag: TagT) => {
    setShowIssueInfo(tag);
  }, []);

  const onRosterRoomClick = React.useCallback(
    (room: EventRoom, opts: LayoutOptions) => {
      const firstUnreadMessageId = badges[room.id]?.firstUnreadMessage?.id;
      const nextMentionMessageId = badges[room.id]?.nextMentionMessage?.id;
      tryOpenRoomLayoutOpts.current.set(room.id, opts);
      if (openRoomIds.includes(room.id)) {
        if (activeRoomId === room.id) {
          setActiveRoomId(undefined);
        } else {
          setActiveRoomId(room.id);
        }
      } else if (room.relevantMessage) {
        updateLoadAround(room.id, room.relevantMessage.id);
      } else if (firstUnreadMessageId) {
        updateLoadAround(room.id, firstUnreadMessageId);
      } else if (nextMentionMessageId) {
        updateLoadAround(room.id, nextMentionMessageId);
      } else {
        tryOpenRoom(room);
      }
    },
    [openRoomIds, activeRoomId, badges, updateLoadAround, tryOpenRoom, showIssueInfo]
  );

  const [showRoomSettings, setShowRoomSettings] = React.useState<string>();
  const [showNotificationsSettings, setShowNotificationsSettings] = React.useState<boolean>(false);

  const closeAutocomplete = useCloseAutocompleteCallback();

  const onCloseRoom = React.useCallback(
    (roomId: string) => {
      const newLayout = closeRooms([roomId], layout);
      closeAutocomplete(roomId);
      saveLayout(newLayout);
      if (roomId === activeRoomId) {
        setActiveRoomId(undefined);
      }
      setShowRoomSettings(x => (x === roomId ? undefined : x));
    },
    [closeAutocomplete, closeRooms, layout, saveLayout, activeRoomId]
  );

  const onCloseOtherRooms = React.useCallback(
    (roomId?: string) => {
      const otherIds = layout.map(x => x.i).filter(x => x !== roomId && !layoutPins.includes(x));
      otherIds.forEach(closeAutocomplete);
      const newLayout = closeRooms(otherIds, layout);
      if (newLayout.length > 1) {
        saveLayout(newLayout);
      } else {
        saveLayout([{ ...newLayout[0], x: 0, y: 0, w: maxCols, h: maxRows }]);
      }
    },
    [closeAutocomplete, closeRooms, layout, saveLayout, maxCols, maxRows]
  );

  const setRoomPin = React.useCallback(
    (roomId: string | undefined, pinned: boolean) => {
      if (roomId) {
        setLayoutPins(pins =>
          pins.filter(x => x !== roomId).concat(pinned && roomId ? [roomId] : [])
        );
      }
    },
    [layoutPins]
  );

  React.useEffect(() => {
    if (loadAround) {
      const { roomId: loadAroundRoomId } = loadAround;
      if (loadAroundRoomId && JSON.stringify(loadAround) !== JSON.stringify(prevLoadAround)) {
        const room = roomById(loadAroundRoomId);
        if (room) {
          tryOpenRoom(room);
        }
      }
    }
  }, [roomById, tryOpenRoom, loadAround, prevLoadAround]);

  React.useEffect(() => {
    setWaitForRoomToOpen(roomIdToOpen);
  }, [roomIdToOpen]);

  const adjustLayout = React.useCallback(
    (layout: Layout[]) => {
      const roomsToClose: string[] = [];
      layout.forEach((item, i) => {
        if (item.x >= maxCols || item.y >= maxRows) {
          roomsToClose.push(item.i);
        } else {
          if (item.x + item.w > maxCols) {
            layout[i] = { ...item, w: maxCols - item.x };
          }
          if (item.y + item.h > maxRows) {
            layout[i] = { ...item, h: maxRows - item.y };
          }
        }
      });

      if (roomsToClose.length > 0) {
        let newLayout = layout;
        roomsToClose.forEach(roomId => {
          newLayout = closeRooms([roomId], newLayout);
        });
        return newLayout;
      }

      return layout;
    },
    [maxCols, maxRows, closeRooms]
  );

  React.useLayoutEffect(() => {
    const html = document.querySelector("html");
    const body = document.querySelector("html.admin body");
    html?.classList.add("overflow-hidden");
    body?.classList.add("overflow-y-hidden");
    return () => {
      html?.classList.remove("overflow-hidden");
      body?.classList.remove("overflow-y-hidden");
    };
  }, []);

  const appRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(
    appRef,
    () => setActiveRoomId(undefined),
    singleRoomMode || activeRoomId === undefined,
    true
  );

  const notificationsRef = React.useRef<HTMLDivElement>(null);
  useClickOutside(
    notificationsRef,
    () => setShowNotificationsSettings(false),
    showNotificationsSettings === false,
    false
  );

  const gridContainerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    let sensor: ResizeSensor | undefined;
    if (gridContainerRef.current) {
      sensor = new ResizeSensor(gridContainerRef.current, ({ width, height }) => {
        const minRoomWidth = width < 640 ? width : 375;
        const minRoomHeight = 420;
        const cols = isAgent || !isIframe ? Math.floor(width / minRoomWidth) : 1;
        const rows =
          isAgent || !isIframe ? (width < 640 ? 1 : Math.floor(height / minRoomHeight) || 1) : 1;
        const rowHeight = Math.floor(height / rows);

        setMaxCols(cols);
        setMaxRows(rows);
        setRowHeight(rowHeight);

        if (!isAgent && !helpdeskId) {
          return;
        }

        if (!layoutInitialized) {
          setLayout(initialLayout);
          setLayoutInitialized(true);
        }
      });
    }
    return () => {
      if (sensor) {
        sensor.detach();
      }
    };
  }, [initialLayout, layoutInitialized, isAgent, helpdeskId]);

  React.useLayoutEffect(() => {
    if (layoutInitialized) {
      saveLayout(adjustLayout(layout));
    }
  }, [layoutInitialized, layout, adjustLayout, saveLayout]);

  const { onNotification: onAgentNotification } = useAgentNotifications({
    roomById,
    ourId,
    notificationTitle: "Fogbender",
    setRoomToOpen: tryOpenRoom,
    isIdle,
  });

  const notificationTitle = React.useMemo(
    () => `${helpdesk?.vendorName} Support`,
    [helpdesk?.vendorName]
  );
  const { onNotification: onClientNotifications } = useClientNotifications({
    roomById,
    ourId,
    notificationTitle,
    setRoomToOpen: setRoomIdToOpen ? ({ id }) => setRoomIdToOpen(id) : undefined,
  });

  const [muted] = useAtom(muteNotificationsAtom);

  const { lastIncomingMessage } = useOnNotifications({
    onNotification: muted ? noop : isAgent ? onAgentNotification : onClientNotifications,
    userId: ourId,
  });

  const isFaviconEnabled = isAgent === false && isIframe !== true;
  useFavicon(isFaviconEnabled, badges, roomById, isIdle === true, lastIncomingMessage);

  const [avatarUrl, setAvatarUrl] = React.useState<string>();

  React.useEffect(() => {
    if (
      lastIncomingMessage !== undefined &&
      isEventUser(lastIncomingMessage) &&
      lastIncomingMessage.userId === ourId
    ) {
      setAvatarUrl(lastIncomingMessage.imageUrl);
    }
  }, [ourId, userAvatarUrl, lastIncomingMessage]);

  const userInfo = React.useMemo(() => {
    if (token && "userId" in token && ourId && !("visitor" in token) && authorMe) {
      return {
        id: ourId,
        name: token.userName,
        avatarUrl: avatarUrl || userAvatarUrl,
        customerName: authorMe.customerName,
      };
    } else if (ourId && token && "visitor" in token && authorMe) {
      return {
        id: ourId,
        name: authorMe.name,
        avatarUrl: avatarUrl || userAvatarUrl || authorMe.avatarUrl,
        customerName: authorMe.customerName,
      };
    }
    return undefined;
  }, [ourId, avatarUrl, userAvatarUrl, token, authorMe]);

  React.useEffect(() => {
    workspaceId &&
      SafeLocalStorage.setItem(LocalStorageKeys.SelectedCustomersForWorkspace, workspaceId);
  }, [workspaceId]);

  const [customersListExpanded, setCustomersListExpanded] = React.useState(false);

  const sideBarRef = React.useRef(null);
  useClickOutside(
    sideBarRef,
    () => setCustomersListExpanded(false),
    !customersListExpanded,
    false,
    true
  );

  const [createRoomMode, setCreateRoomMode] = React.useState<boolean | string>(false);

  const onCreateRoom = React.useCallback((id: string) => {
    setWaitForRoomToOpen(id);
    setCreateRoomMode(false);
  }, []);

  const [rosterVisible, setRosterVisible] = React.useState(true);

  React.useEffect(() => {
    if (openRoomIds.length === 0) {
      setRosterVisible(true);
    } else {
      setRosterVisible(false);
    }
  }, [openRoomIds]);

  const [dragging, setDragging] = React.useState(false);
  const [roomClickDelay, setRoomClickDelay] = React.useState(false);
  const handleRoomClick = React.useCallback(
    (id: string) => {
      if (!roomClickDelay) {
        setActiveRoomId(id);
      }
    },
    [roomClickDelay]
  );
  React.useEffect(() => {
    if (roomClickDelay && !dragging) {
      const t = setTimeout(() => setRoomClickDelay(false), 300);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [roomClickDelay, dragging]);

  const singleRoomId = React.useMemo(() => {
    if (singleRoomMode) {
      const roomId = activeRoomId || openRoomIds[0];
      return roomId;
    }
    return undefined;
  }, [activeRoomId, openRoomIds, singleRoomMode]);

  const activeRoom = React.useMemo(() => {
    return singleRoomId ? roomById(singleRoomId) : undefined;
  }, [singleRoomId, roomById]);

  const [hideWelcome, setHideWelcome] = useAtom(hideWelcomeAtom);
  const [showUserWelcome, setShowUserWelcome] = React.useState(!hideWelcome);
  const closeWelcome = React.useCallback(() => {
    setHideWelcome(true);
    setShowUserWelcome(false);
  }, [setHideWelcome]);

  const initialsUrl = "https://api.dicebear.com/7.x/initials/";

  React.useEffect(() => {
    if (
      authorMe?.avatarUrl !== undefined &&
      authorMe?.avatarUrl !== null &&
      ourId !== undefined &&
      isUser
    ) {
      updateUser({
        userId: ourId,
        imageUrl: authorMe?.avatarUrl,
      }).then(x => {
        if (x.msgType !== "User.Ok") {
          throw x;
        }
        setAvatarUrl(authorMe?.avatarUrl);
      });
    }
  }, [authorMe, ourId, isUser, updateUser]);

  const handleUserAvatarClick = React.useCallback(() => {
    if (userInfo !== undefined && ourId !== undefined && token !== undefined) {
      const newUrl =
        avatarLibraryUrl === initialsUrl
          ? `${avatarLibraryUrl}svg?seed=${userInfo.name}${Date.now().toString()}`
          : `${avatarLibraryUrl}svg?seed=${Date.now().toString()}`;

      if (avatarLibraryUrl !== undefined && newUrl !== undefined && newUrl !== null) {
        updateUser({
          userId: ourId,
          imageUrl: newUrl,
        }).then(x => {
          if (x.msgType !== "User.Ok") {
            throw x;
          }
        });
      }
    }
  }, [token, userInfo, ourId, updateUser]);

  const [waitForUserTriage, setWaitForUserTriage] = React.useState(false);

  React.useEffect(() => {
    if (!waitForUserTriage) {
      return;
    }
    if ((layoutInitialized && initialLayout.length > 0) || roomIdToOpen !== undefined) {
      setWaitForUserTriage(false);
    } else {
      const triage = roster.find(x => x.isTriage);
      if (triage) {
        setWaitForRoomToOpen(triage?.id);
        setWaitForUserTriage(false);
      }
    }
  }, [roster, waitForRoomToOpen, waitForUserTriage, layoutInitialized, roomIdToOpen]);

  const floatieHeaderRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (hideWelcome || !isUser || !userInfo) {
      return;
    }

    // Check we're not in user's floatie mode
    // (opens Triage only when in embedded or full-screen mode, on first login)
    const headerWidth = floatieHeaderRef.current?.getBoundingClientRect().width || 0;
    const headerHeight = floatieHeaderRef.current?.getBoundingClientRect().height || 0;
    if (!headerWidth && !headerHeight) {
      setWaitForUserTriage(true);
    }
  }, [hideWelcome, isUser, userInfo]);

  // unreadBadge
  const [recentBadge, setRecentBadge] = React.useState(false);
  React.useEffect(() => {
    // incoming unread badge in rooms that are invisible right now
    if (lastIncomingMessage?.msgType === "Event.Badge") {
      if (lastIncomingMessage.count > 0 && lastIncomingMessage.roomId !== activeRoom?.id) {
        setRecentBadge(true);
      }
    }
  }, [activeRoom?.id, lastIncomingMessage]);
  const unreadBadge = React.useMemo(() => {
    const unreadRoomsCount = Object.values(badges).filter(
      c => c.count > 0 && c.roomId !== activeRoom?.id
    ).length;
    if (!unreadRoomsCount) {
      return undefined;
    }
    const mentionsCount = Object.values(badges).some(x => x.mentionsCount > 0) ? 1 : 0;

    return (
      <>
        <UnreadCircle total={unreadRoomsCount} asMention={(mentionsCount ?? 0) > 0} />
        <div className="absolute top-0 right-0.5">
          <RecentUnreadCircle recentBadge={recentBadge} setRecentBadge={setRecentBadge} />
        </div>
      </>
    );
  }, [badges, recentBadge]);

  const internalHelpdeskId = React.useMemo(
    () => customers.find(c => isInternalHelpdesk(c.name))?.helpdeskId,
    [customers]
  );

  const { helpdeskTags } = useUserTags({ userId: isAgent ? undefined : ourId });

  const paneIdToRoomId = (paneId: string) => {
    const search = paneId.match(/^search[0-9]*-(.*)/);

    if (search) {
      const [, roomId] = search;
      return roomId;
    } else {
      console.error(`Couldn't parse paneId: ${paneId}`);
      return paneId;
    }
  };

  const [isOutlook] = useAtom(showOutlookRosterAtom);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string>();
  const [selectedCustomerIds, setSelectedCustomerIds] = React.useState<Set<string>>(new Set([]));

  React.useEffect(() => {
    if (layout.length) {
      dispatchEvent(new Event("resize")); // WidthProvider calculates width value only upon initialization or when a resize event is triggered.
      // Reference: https://github.com/react-grid-layout/react-grid-layout
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOutlook]);

  const infoPane: "issue" | "customer" | "user" | undefined = React.useMemo(() => {
    if (vendorId) {
      if (
        activeRoomId &&
        isExternalHelpdesk(roomById(activeRoomId)?.customerName) &&
        !showIssueInfo
      ) {
        return "user";
      } else if (activeRoomId && !showIssueInfo) {
        return "customer";
      } else if (showIssueInfo && workspaceId) {
        return "issue";
      }
    }

    return undefined;
  }, [activeRoomId, vendorId, showIssueInfo, workspaceId]);

  const onGoFullScreen =
    isIframe && token && ("userId" in token || "visitor" in token)
      ? () => handleGoFullScreen(token, visitorJWT)
      : undefined;

  const roomName = roomToName(activeRoom, ourId, !!isAgent);

  return (
    <div
      ref={appRef}
      className={classNames(
        "relative h-full max-h-screen flex-1 flex flex-col z-10",
        mode === "dark" && (isIframe ? "bg-gray-800 dark" : "bg-black dark")
      )}
    >
      {isUser && userInfo && (
        <div
          ref={floatieHeaderRef}
          className={classNames(
            "sm:hidden relatve flex items-center gap-x-2 bg-blue-500 text-white py-3 px-4 fog:text-caption-xl leading-loose",
            "dark:bg-black"
          )}
        >
          <div className="flex-1">
            {activeRoom && roomName && (
              <div className={classNames("h-8 flex items-center justify-center sm:hidden")}>
                <RoomNameLine
                  mode="Room"
                  room={activeRoom}
                  paneId={activeRoom.id}
                  onClose={onCloseRoom}
                  rosterVisible={rosterVisible}
                  unreadBadge={unreadBadge}
                  roomName={roomName}
                />
              </div>
            )}
            <span
              className={classNames(singleRoomMode && activeRoom && "hidden sm:inline", "flex")}
            >
              <span
                className={classNames(
                  "layout-nodrag mr-2 flex items-center cursor-pointer",
                  rosterVisible ? "hidden" : "sm:hidden"
                )}
                onClick={() => {
                  if (singleRoomId) {
                    onCloseRoom(singleRoomId);
                  }
                }}
              >
                <Icons.ArrowBack />
              </span>
              {helpdesk?.vendorName}
            </span>
          </div>
          {isIframe && token && ("userId" in token || "visitor" in token) && (
            <div className="h-full flex items-center">
              <GoFullScreen token={token} visitorJWT={visitorJWT} />
            </div>
          )}
        </div>
      )}
      <div className="relative h-full flex-1 flex">
        <div
          className={classNames(
            "absolute z-10 sm:static sm:z-0 top-0 left-0 bottom-0 flex flex-col bg-white text-sm transform sm:transform-none transition-transform",
            "dark:bg-gray-800 dark:text-white",
            rosterVisible ? "translate-x-0" : "-translate-x-full sm:translate-x-0",
            isAgent && isOutlook ? "w-full sm:w-[32rem]" : "w-full sm:w-80"
          )}
        >
          <div className="flex overflow-hidden h-full">
            <div className="flex flex-col pl-3 pr-2 pt-2 w-full overflow-hidden">
              {userInfo && (
                <div className="relative flex items-center justify-end gap-x-2">
                  <div className="flex flex-col text-right truncate">
                    <div className="flex items-center space-x-1">
                      <span className="flex-1 flex flex-col fog:text-caption-xl truncate">
                        <span
                          title={userInfo.name}
                          className={classNames(
                            "truncate",
                            userType && ["visitor-unverified"].includes(userType) && "text-sm"
                          )}
                        >
                          {userInfo.name}
                        </span>
                      </span>
                    </div>
                    {userInfo.customerName && userType === "user" ? (
                      <div className="fog:text-body-m truncate">{userInfo.customerName}</div>
                    ) : (
                      <div className="fog:text-body-m truncate">
                        <span>{helpdesk?.vendorName} support chat</span>
                      </div>
                    )}
                  </div>
                  <div
                    className={classNames(
                      userType &&
                        ["user", "visitor-verified", "visitor-unverified"].includes(userType) &&
                        "cursor-pointer"
                    )}
                    onClick={e => {
                      if (
                        userType &&
                        ["user", "visitor-verified", "visitor-unverified"].includes(userType)
                      ) {
                        setShowUserWelcome(true);
                        if (e.ctrlKey || e.metaKey) {
                          setHideWelcome(false);
                        }
                      }
                    }}
                  >
                    <Avatar url={userInfo.avatarUrl} name={userInfo.name} size={32} />
                  </div>
                  <div
                    className="cursor-pointer"
                    onClick={() => setShowNotificationsSettings(x => !x)}
                  >
                    <Icons.Bell />
                  </div>
                  {ourId && showNotificationsSettings === true && (
                    <div
                      ref={notificationsRef}
                      className={classNames(
                        "bg-white border border-gray-100 rounded-xl shadow-md absolute mt-10 top-0 overflow-auto z-30",
                        !showNotificationsSettings && "invisible"
                      )}
                    >
                      <EmailNotificationsSettings userId={ourId} />
                    </div>
                  )}
                </div>
              )}
              <div
                className={classNames(
                  "flex gap-2 border-b border-gray-200 w-full",
                  "dark:border-gray-500"
                )}
              >
                <form
                  onSubmit={rosterInputSubmit}
                  className={classNames("flex gap-2 bg-white w-full", "dark:bg-gray-800")}
                >
                  {isAgent && <RosterMenu />}
                  <FilterInput
                    noBorder={true}
                    placeholder="Search"
                    value={rosterSearch}
                    setValue={setRosterSearch}
                    addButton={isAgent ? "CREATE ROOM" : undefined}
                    onAddButtonClick={
                      isAgent ? () => setCreateRoomMode(rosterSearch || true) : undefined
                    }
                    wrapperClassName="flex-1"
                  />
                </form>
              </div>
              {isAgent && !isOutlook && (
                // roster and search for agents (old one)
                <div className="h-full flex flex-col -mt-12 pt-12">
                  {searching && (
                    <OldRoster
                      rooms={sortedDoubleFilteredRoster}
                      badges={badges}
                      openRoomIds={openRoomIds}
                      activeRoomId={activeRoomId}
                      onRosterRoomClick={onRosterRoomClick}
                      onRoomSettingsClick={setShowRoomSettings}
                      isAgent={true}
                      searchString={searchString}
                      searchForMessages={false}
                      ourId={ourId}
                    />
                  )}
                  {searching && <hr />}
                  {searching && (
                    <OldRoster
                      rooms={sortedDoubleFilteredRoster}
                      badges={badges}
                      openRoomIds={openRoomIds}
                      activeRoomId={activeRoomId}
                      onRosterRoomClick={onRosterRoomClick}
                      onRoomSettingsClick={setShowRoomSettings}
                      isAgent={true}
                      searchString={searchString}
                      searchForMessages={true}
                      ourId={ourId}
                    />
                  )}
                  <Roster
                    openRoomIds={openRoomIds}
                    activeRoomId={activeRoomId}
                    onRosterRoomClick={onRosterRoomClick}
                    onRoomSettingsClick={setShowRoomSettings}
                    userId={ourId}
                    isAgent={true}
                    searching={searching}
                    isIframe={isIframe}
                  />
                </div>
              )}
              {isAgent && isOutlook && (
                // roster and search for agents (new one)
                <div className="h-full flex flex-col -mt-12 pt-12">
                  {searching && (
                    // search for agents
                    <OldRoster
                      rooms={sortedDoubleFilteredRoster}
                      badges={badges}
                      openRoomIds={openRoomIds}
                      activeRoomId={activeRoomId}
                      onRosterRoomClick={onRosterRoomClick}
                      onRoomSettingsClick={setShowRoomSettings}
                      isAgent={true}
                      searchString={searchString}
                      searchForMessages={false}
                      ourId={ourId}
                    />
                  )}
                  {searching && <hr />}
                  {searching && (
                    <OldRoster
                      rooms={sortedDoubleFilteredRoster}
                      badges={badges}
                      openRoomIds={openRoomIds}
                      activeRoomId={activeRoomId}
                      onRosterRoomClick={onRosterRoomClick}
                      onRoomSettingsClick={setShowRoomSettings}
                      isAgent={true}
                      searchString={searchString}
                      searchForMessages={true}
                      ourId={ourId}
                    />
                  )}
                  {/* outlook fog agents */}
                  <div className={classNames("h-full w-full", searching ? "hidden" : "flex")}>
                    <div className="h-full w-32 flex flex-col">
                      {workspaceId && (
                        <Customers
                          selectedCustomerIds={selectedCustomerIds}
                          onSelectCustomerId={customerId => {
                            if (!customerId) {
                              setSelectedCustomerIds(new Set<string>([]));
                            } else {
                              setSelectedCustomerIds(s => {
                                s.has(customerId) ? s.delete(customerId) : s.add(customerId);
                                return new Set(s);
                              });
                            }
                          }}
                        />
                      )}
                    </div>
                    <div className="h-full w-32 flex flex-col">
                      <Folders
                        ourId={ourId}
                        isAgent={isAgent === true}
                        searching={searching}
                        onSelectSectionId={sectionId =>
                          setSelectedSectionId(x => {
                            if (sectionId === x) {
                              return undefined;
                            } else {
                              return sectionId;
                            }
                          })
                        }
                        selectedSectionId={selectedSectionId}
                        selectedCustomerIds={selectedCustomerIds}
                      />
                    </div>
                    <SectionRoster
                      selectedSectionId={selectedSectionId}
                      openRoomIds={openRoomIds}
                      activeRoomId={activeRoomId}
                      onRosterRoomClick={onRosterRoomClick}
                      onRoomSettingsClick={setShowRoomSettings}
                      userId={ourId}
                      isAgent={isAgent === true}
                      searching={searching}
                    />
                  </div>
                </div>
              )}
              {!isAgent && (
                // roster and search for clients
                <div
                  className={classNames(
                    "h-full flex flex-col",
                    isIframe ? "-mt-36 pt-36" : "-mt-12 pt-12"
                  )}
                >
                  {searching && (
                    <OldRoster
                      rooms={sortedDoubleFilteredRoster}
                      badges={badges}
                      openRoomIds={openRoomIds}
                      activeRoomId={activeRoomId}
                      onRosterRoomClick={onRosterRoomClick}
                      onRoomSettingsClick={setShowRoomSettings}
                      isAgent={false}
                      searchString={searchString}
                      searchForMessages={false}
                      ourId={ourId}
                    />
                  )}
                  {searching && <hr />}
                  {searching && (
                    <OldRoster
                      rooms={sortedDoubleFilteredRoster}
                      badges={badges}
                      openRoomIds={openRoomIds}
                      activeRoomId={activeRoomId}
                      onRosterRoomClick={onRosterRoomClick}
                      onRoomSettingsClick={setShowRoomSettings}
                      isAgent={false}
                      searchString={searchString}
                      searchForMessages={true}
                      ourId={ourId}
                    />
                  )}
                  <Roster
                    openRoomIds={openRoomIds}
                    activeRoomId={activeRoomId}
                    onRosterRoomClick={onRosterRoomClick}
                    onRoomSettingsClick={setShowRoomSettings}
                    userId={ourId}
                    isAgent={false}
                    searching={searching}
                    isIframe={isIframe}
                  />
                </div>
              )}
              {!isAgent && (
                <div
                  className={classNames(
                    "flex snap-x snap-mandatory overflow-x-auto scrollbar-hide border-t border-gray-200 mt-2",
                    "dark:border-gray-500"
                  )}
                >
                  <div className="w-full shrink-0 snap-center flex">
                    <div
                      className="flex items-center cursor-pointer z-20"
                      onClick={e => {
                        e.preventDefault();
                        setMode(m => (m === "light" ? "dark" : "light"));
                      }}
                    >
                      {mode === "light" && <Icons.SwitchLightMode className="w-9" />}
                      {mode === "dark" && <Icons.SwitchDarkMode className="w-9" />}
                    </div>
                    <a
                      href="https://fogbender.com"
                      target="_blank"
                      rel="noopener"
                      className="-ml-9 flex-1 flex items-center justify-center gap-x-1 py-2"
                      onClick={e => {
                        if (e.ctrlKey || e.metaKey) {
                          e.preventDefault();
                          e.currentTarget.parentElement?.nextElementSibling?.scrollIntoView({
                            behavior: "smooth",
                          });
                        }
                      }}
                    >
                      <span className="fog:text-body-xs">Powered by</span>
                      <span className="fog:text-body-xs">
                        <FogbenderLogo className="w-5" />
                      </span>
                      <span className="fog:text-caption-l">Fogbender</span>
                    </a>
                  </div>
                  <div
                    className="w-full shrink-0 snap-center"
                    onClick={e => {
                      if (e.ctrlKey || e.metaKey) {
                        e.currentTarget.previousElementSibling?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }
                    }}
                  >
                    <div
                      className="flex items-center justify-center gap-x-1 py-2"
                      title={version.debugVersion}
                    >
                      version {version.niceVersion}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1" ref={gridContainerRef}>
          <ResponsiveReactGridLayout
            className="layout z-0"
            layouts={{ xxs: [...layout] || [] }}
            breakpoints={{ xxs: 0 }}
            cols={{ xxs: maxCols || 1 }}
            margin={[0, 0]}
            maxRows={maxRows}
            rowHeight={rowHeight}
            preventCollision={true}
            autoSize={false}
            compactType={null}
            isDraggable={!singleRoomMode}
            draggableCancel=".layout-nodrag"
            draggableHandle=".layout-drag"
            onLayoutChange={setLayout}
            onDragStart={() => setDragging(true)}
            onDragStop={() => setDragging(false)}
            onDrag={() => setRoomClickDelay(true)}
            onResizeStart={(_, item) => setResizingRoomId(item.i)}
            onResizeStop={() => requestAnimationFrame(() => setResizingRoomId(undefined))}
          >
            {layout.map(el => (
              <div
                className={classNames(singleRoomMode ? "sm:pl-2" : "p-0 sm:p-2")}
                key={el.i}
                onClick={() => {
                  handleRoomClick(el.i);
                }}
              >
                {el.i.startsWith("search-") ? (
                  <Search
                    paneId={el.i}
                    roomId={paneIdToRoomId(el.i)}
                    isAgent={isAgent}
                    myAuthor={myAuthor}
                    activeRoomId={activeRoomId}
                    singleRoomMode={singleRoomMode}
                    isLayoutPinned={layoutPins.includes(el.i)}
                    isExpanded={el.w === maxCols && el.h === maxRows}
                    roomById={roomById}
                    onClose={onCloseRoom}
                    onCloseOtherRooms={onCloseOtherRooms}
                    onSetRoomPin={setRoomPin}
                    rosterVisible={rosterVisible}
                  />
                ) : (
                  <Room
                    myAuthor={myAuthor}
                    ourId={ourId}
                    isAgent={isAgent}
                    billing={billing}
                    agents={agents}
                    roomId={el.i}
                    vendorId={vendorId}
                    workspaceId={workspaceId}
                    helpdesk={helpdesk}
                    activeRoomId={activeRoomId}
                    setActiveRoomId={setActiveRoomId}
                    onGoFullScreen={onGoFullScreen}
                    isLayoutPinned={layoutPins.includes(el.i)}
                    resizing={resizingRoomId === el.i}
                    dragging={dragging}
                    onClose={onCloseRoom}
                    onCloseOtherRooms={onCloseOtherRooms}
                    onSettings={setShowRoomSettings}
                    onOpenSearch={onOpenSearch}
                    onOpenDialog={onOpenDialog}
                    onSetRoomPin={setRoomPin}
                    showIssueInfo={showIssueInfo}
                    onShowIssueInfo={onShowIssueInfo}
                    roomById={roomById}
                    firstUnreadId={badges[el.i]?.firstUnreadMessage?.id}
                    firstUnreadMentionId={badges[el.i]?.nextMentionMessage?.id}
                    workspaceIntegrations={workspaceIntegrations}
                    isIdle={isIdle === true}
                    singleRoomMode={singleRoomMode}
                    isExpanded={el.w === maxCols && el.h === maxRows}
                    isConnected={isConnected && isAuthenticated}
                    agentRole={agentRole}
                    internalHelpdeskId={internalHelpdeskId}
                    rosterVisible={rosterVisible}
                    openRoom={onRosterRoomClick}
                  />
                )}
              </div>
            ))}
          </ResponsiveReactGridLayout>
        </div>
        {isAgent && vendorId && (
          <div className="resize-x w-1/3 hidden md:w-1/4 xl:w-1/5 md:block border-l-2">
            {activeRoomId && infoPane === "customer" && (
              // TODO: without key=, useHelpdeskUsers and useHelpdeskRooms hooks accumulate rooms/users across helpdesks
              <CustomerInfoPane
                key={roomById(activeRoomId)?.helpdeskId}
                activeRoomId={activeRoomId}
                ourId={ourId}
                helpdeskId={roomById(activeRoomId)?.helpdeskId}
                vendorId={vendorId}
                openRoom={onRosterRoomClick}
                agents={agents}
                renderCustomerInfoPane={renderCustomerInfoPane}
                showIssueInfo={showIssueInfo}
                setShowIssueInfo={setShowIssueInfo}
              />
            )}

            {activeRoomId && infoPane === "user" && (
              <UsersInfoPane
                key={roomById(activeRoomId)?.helpdeskId}
                room={roomById(activeRoomId)}
                renderUsersInfoPane={renderUsersInfoPane}
              />
            )}

            {workspaceId && showIssueInfo && infoPane === "issue" && (
              <IssueInfoPane
                activeRoomId={activeRoomId}
                key={showIssueInfo.workspace_id}
                ourId={ourId}
                workspaceId={workspaceId}
                vendorId={vendorId}
                tag={showIssueInfo}
                openRoom={onRosterRoomClick}
                agents={agents}
                setShowIssueInfo={setShowIssueInfo}
              />
            )}
          </div>
        )}

        {showRoomSettings !== undefined && (
          <Modal onClose={() => setShowRoomSettings(undefined)}>
            <RoomSettings
              isLayoutPinned={layoutPins.includes(showRoomSettings)}
              userId={ourId}
              roomId={showRoomSettings}
              workspaceId={workspaceId}
              vendorId={vendorId}
              onClose={onCloseRoom}
              openRoomIds={openRoomIds}
              onSetRoomPin={setRoomPin}
              roomById={roomById}
              tags={isAgent ? workspaceTags : helpdeskTags}
              hasUnread={!!badges[showRoomSettings]?.count}
              workspaceIntegrations={workspaceIntegrations}
              workspaceTags={workspaceTags}
            />
          </Modal>
        )}

        <div
          className={classNames(
            "z-10 absolute h-0 left-0 right-0 flex justify-center px-4 max-w-screen-xl mx-auto",
            isAgent
              ? "left-0 right-0 top-0 items-center"
              : "-top-10 left-6 right-0 sm:top-2 sm:left-0 sm:right-0 items-start"
          )}
        >
          <div className="flex flex-col gap-y-2 items-center pointer-events-none">
            <NotificationsPermissionRequest
              isUser={isUser}
              vendorName={helpdesk?.vendorName}
              notificationsPermission={notificationsPermission}
              setNotificationsPermission={setNotificationsPermission}
            />
            <ConnectionIssue
              size="small"
              isConnected={isConnected}
              isAuthenticated={isAuthenticated}
              isTokenWrong={isTokenWrong}
              disconnects={isAgent ? disconnectCounter : 0}
            />
          </div>
        </div>
        {createRoomMode && (
          <Modal onClose={() => setCreateRoomMode(false)}>
            <CreateRoom
              userId={ourId}
              isAgent={isAgent}
              workspaceId={workspaceId}
              helpdeskId={helpdeskId}
              onCreate={onCreateRoom}
              initialValue={typeof createRoomMode === "string" ? createRoomMode : undefined}
            />
          </Modal>
        )}
        {showUserWelcome && userInfo && (
          <Modal onClose={closeWelcome} inUserWidget={isUser}>
            <Welcome
              isProfile={hideWelcome}
              helpdesk={helpdesk}
              userInfo={userInfo}
              onAvatarClick={handleUserAvatarClick}
              onClose={closeWelcome}
              changeArrowOff={token === undefined}
              disable={token === undefined || ourId === undefined}
            />
          </Modal>
        )}
      </div>
    </div>
  );
};

const isExternalTriage = (room: RoomT) => {
  return room.isTriage === true && isExternalHelpdesk(room.customerName);
};

function filterRosterRooms(rooms: RoomT[], isAgent: boolean | undefined) {
  const rooms2 = rooms
    .filter(room => isExternalTriage(room) === false)
    .filter(room => room.customerDeletedTs === null || room.customerDeletedTs === undefined);
  if (!isAgent) {
    return rooms2.filter(room => room.isTriage).concat(rooms2.filter(room => !room.isTriage));
  } else {
    return rooms2;
  }
}

const useLayoutLocalStorage = (contextId: string | undefined) => {
  const layoutsKey = contextId ? `v2-${LocalStorageKeys.Layouts}-${contextId}` : undefined;
  const layoutsPinsKey = contextId ? `v2-${LocalStorageKeys.LayoutsPins}-${contextId}` : undefined;

  const initialLayout: Layout[] = React.useMemo(() => {
    const saved = layoutsKey && JSON.parse(SafeLocalStorage.getItem(layoutsKey) || "null");
    if (Array.isArray(saved)) {
      return saved
        .map(layout => {
          if (typeof layout === "object" && layout) {
            const x = layout as Partial<Layout>;
            if (
              x.i !== undefined &&
              x.x !== undefined &&
              x.y !== undefined &&
              x.w !== undefined &&
              x.h !== undefined
            ) {
              return { i: x.i, x: x.x, y: x.y, w: x.w, h: x.h, ...x };
            }
          }
          return;
        })
        .filter((x): x is Layout => !!x);
    }
    return [];
  }, [layoutsKey]);

  const initialLayoutPins: string[] = React.useMemo(() => {
    const saved = layoutsPinsKey && JSON.parse(SafeLocalStorage.getItem(layoutsPinsKey) || "null");
    if (Array.isArray(saved)) {
      return saved.filter((x): x is string => typeof x === "string");
    }
    return [];
  }, [layoutsPinsKey]);

  const storeLayout = React.useCallback(
    (layouts: Layout[], layoutPins: string[]) => {
      layoutsKey && SafeLocalStorage.setItem(layoutsKey, JSON.stringify(layouts));
      layoutsPinsKey && SafeLocalStorage.setItem(layoutsPinsKey, JSON.stringify(layoutPins));
    },
    [layoutsKey]
  );

  return { initialLayout, initialLayoutPins, storeLayout };
};

const noop = () => {};
