import { serialize } from "bson";
import React from "react";
import useWebSocket, { ReadyState, Options } from "react-use-websocket";

import { getServerApiUrl, getServerWsUrl } from "./config";
import { AnyToken, Helpdesk, FogSchema, PingPing, ServerCalls, ServerEvents } from "./schema";
import { Client } from "./client";

type Requests = {
  message: ServerCalls["outbound"];
  resolve: (r: ServerCalls["inbound"]) => void;
};

export type ServerCall = <T extends ServerCalls["orig"]>(
  origMessage: T
) => Promise<Extract<ServerCalls, { orig: T }>["inbound"]>;

export type ServerEvent = ServerEvents["inbound"];

const defaultOnError: NonNullable<Client["onError"]> = (type, kind, ...errors) => {
  if (type === "error") {
    // eslint-disable-next-line no-console
    console.error(kind, ...errors);
  } else if (type === "warning") {
    // eslint-disable-next-line no-console
    console.warn(kind, ...errors);
  } else {
    // eslint-disable-next-line no-console
    console.log(kind, ...errors);
  }
};

const isAuthMessage = (message: FogSchema["outbound"]) =>
  message.msgType === "Auth.Agent" || message.msgType === "Auth.User";

export function useServerWs(
  client: Client,
  token: AnyToken | undefined,
  isIdle?: boolean | undefined,
  suspendConnection?: boolean
) {
  const [helpdesk, setHelpdesk] = React.useState<Helpdesk>();
  const [lastIncomingMessage, setLastIncomingMessage] = React.useState<
    ServerEvents["inbound"] | undefined
  >();
  const inFlight = React.useRef(new Map<string, Requests>());
  const queue = React.useRef<FogSchema["outbound"][]>([]);
  const ready = React.useRef<ReadyState>(0);
  const waitForCloseRef = React.useRef(false);
  const authenticated = React.useRef(false);
  const wrongToken = React.useRef(false);
  const env = client.getEnv?.();
  const onError = client.onError || defaultOnError;
  const socketUrl = getServerWsUrl(env, client);

  // We'll check that later when processing async requests,
  // to stop when token was changed in flight
  const currentToken = React.useRef<AnyToken | undefined>();
  currentToken.current = token;

  const opts = React.useMemo((): Options => {
    return {
      shouldReconnect: () => true,
      reconnectAttempts: Infinity,
      onClose: () => (authenticated.current = false),
    };
  }, []);

  const connect = !suspendConnection && !(token === undefined || wrongToken.current);
  const {
    sendMessage: sendMessageOrig,
    lastMessage,
    readyState,
    getWebSocket,
  } = useWebSocket(socketUrl, opts, connect);
  ready.current = readyState;

  React.useEffect(() => {
    if (lastMessage !== null) {
      let message: FogSchema["inbound"] | undefined;
      try {
        message = JSON.parse(lastMessage.data);
      } catch (e) {
        onError("error", "other", new Error("Failed to parse incoming data"), e);
      }
      if (message) {
        if (!isServerEvent(message)) {
          const x = inFlight.current.get(message.msgId);
          if (x) {
            inFlight.current.delete(message.msgId);
            x.resolve(message);
          }
        } else {
          setLastIncomingMessage(message);
        }
      }
    }
  }, [lastMessage]);

  React.useEffect(() => {
    setLastIncomingMessage(undefined);
  }, [token]);

  const flushQueue = React.useCallback(() => {
    queue.current.forEach(m => {
      const data = "binaryData" in m ? serialize(m) : JSON.stringify(m);
      sendMessageOrig(data);
    });
    queue.current = [];
  }, [sendMessageOrig]);

  const sendMessage = React.useCallback(
    (message: FogSchema["outbound"]) => {
      const socketIsOpen = ready.current === ReadyState.OPEN && !waitForCloseRef.current;
      if (isAuthMessage(message)) {
        queue.current = queue.current.filter(x => !isAuthMessage(x));
        queue.current.unshift(message);
      } else {
        queue.current.push(message);
      }
      if (socketIsOpen && (authenticated.current || isAuthMessage(message))) {
        flushQueue();
      }
    },
    [flushQueue]
  );

  React.useEffect(() => {
    if (readyState === ReadyState.OPEN) {
      waitForCloseRef.current = false;
    }
  }, [readyState]);

  const serverCall = React.useCallback(
    ((origMessage: ServerCalls["orig"]) => {
      const message = ensureId(origMessage);
      sendMessage(message);
      const promise = new Promise<ServerCalls["inbound"]>(resolve => {
        inFlight.current.set(message.msgId, { message, resolve });
      });
      return promise;
    }) as ServerCall,
    [sendMessage]
  );

  const respondToMessage = React.useCallback(
    <R extends FogSchema>(message: R["outbound"]) => {
      sendMessage(message);
    },
    [sendMessage]
  );

  const onWrongToken = (token: AnyToken) => {
    wrongToken.current = true;
    client.onWrongToken?.(token);
    getWebSocket()?.close();
  };

  React.useEffect(() => {
    onError("other", "other", ReadyState[readyState]);

    if (token && !authenticated.current && readyState === ReadyState.OPEN) {
      if ("widgetId" in token) {
        serverCall({
          ...token,
          msgType: "Auth.User",
          widgetId: token.widgetId,
        }).then(
          r => {
            if (r.msgType === "Auth.Ok") {
              const { sessionId, userId, helpdeskId, userAvatarUrl } = r;
              authenticated.current = true;
              setHelpdesk(r.helpdesk);
              client.setSession?.(sessionId, userId, helpdeskId, userAvatarUrl);
            } else if (r.msgType === "Auth.Err") {
              if (r.code === 401 || r.code === 403) {
                onWrongToken(token);
              }
            }
          },
          r => {
            onError("error", "other", r);
          }
        );
      } else if ("agentId" in token) {
        fetch(`${getServerApiUrl(env, client)}/token`, {
          method: "post",
          credentials: "include",
        })
          .then(res => res.json())
          .then(res => {
            if (
              !currentToken.current ||
              ("agentId" in currentToken.current && currentToken.current.agentId !== token.agentId)
            ) {
              // Token was changed while waiting for server response
              return;
            }
            if (!res || !res.token) {
              throw new Error("Error getting agent api token");
            }
            const apiToken = res.token;
            const { agentId, vendorId } = token;
            serverCall({
              msgType: "Auth.Agent",
              agentId,
              vendorId,
              token: apiToken,
            }).then(
              r => {
                if (r.msgType === "Auth.Ok") {
                  const { sessionId } = r;
                  authenticated.current = true;
                  setHelpdesk(r.helpdesk);
                  client.setSession?.(sessionId);
                } else if (r.msgType === "Auth.Err") {
                  if (r.code === 401 || r.code === 403) {
                    onWrongToken(token);
                  }
                }
              },
              r => {
                onError("error", "other", r);
              }
            );
          });
      }
    }
  }, [readyState, serverCall, token, client]);

  React.useEffect(() => {
    return () => {
      authenticated.current = false;
      wrongToken.current = false;
      setHelpdesk(undefined);
      if (token) {
        waitForCloseRef.current = true;
        getWebSocket()?.close();
      }
    };
  }, [token]);

  const failedPingCount = React.useRef(0);

  const lastActivityTs = React.useRef<number | undefined>();
  // Update lastActivityTs every time something happens and it's active mode now
  if (isIdle === false) {
    lastActivityTs.current = Date.now() * 1000;
  }
  // Update lastActivityTs on transition to isIdle
  // but only if there was active mode previously
  React.useEffect(() => {
    if (lastActivityTs.current !== undefined && isIdle === true) {
      lastActivityTs.current = Date.now() * 1000;
    }
  }, [isIdle]);

  const isConnected = readyState === ReadyState.OPEN;
  React.useEffect(() => {
    if (!isConnected || wrongToken.current) {
      return;
    }
    const interval = setInterval(() => {
      if (failedPingCount.current >= 1) {
        onError("error", "server_stopped_responding", new Error("Server stopped responding"));
        getWebSocket()?.close();
      }
      failedPingCount.current = failedPingCount.current + 1;
      serverCall<PingPing>({
        msgType: "Ping.Ping",
        lastActivityTs: lastActivityTs.current,
      }).then(
        r => {
          failedPingCount.current = 0;
          console.assert(r.msgType === "Ping.Pong");
        },
        r => {
          onError("error", "other", r);
        }
      );
    }, 30_000);
    return () => {
      clearInterval(interval);
    };
  }, [getWebSocket, readyState, serverCall, isConnected]);
  return {
    serverCall,
    lastIncomingMessage,
    respondToMessage,
    helpdesk,
    isConnected,
    isAuthenticated: authenticated.current,
    isTokenWrong: wrongToken.current,
  };
}

function ensureId(message: ServerCalls["orig"]): FogSchema["outbound"] {
  return hasId(message)
    ? message
    : {
        ...message,
        msgId: Math.random().toString(36).substring(7),
      };
}

function hasId(message: ServerCalls["orig"]): message is FogSchema["outbound"] {
  return message && Boolean("msgId" in message && message.msgId);
}

function isServerEvent(
  x: ServerCalls["inbound"] | ServerEvents["inbound"]
): x is ServerEvents["inbound"] {
  return x.msgType.indexOf("Event.") === 0;
}
