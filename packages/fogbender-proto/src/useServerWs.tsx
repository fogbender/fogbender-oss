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

export function useServerWs(
  client: Client,
  token: AnyToken | undefined,
  isIdle?: boolean | undefined
) {
  const [helpdesk, setHelpdesk] = React.useState<Helpdesk>();
  const [lastIncomingMessage, setLastIncomingMessage] = React.useState<
    ServerEvents["inbound"] | undefined
  >();
  const inFlight = React.useRef(new Map<string, Requests>());
  const queue = React.useRef<FogSchema["outbound"][]>([]);
  const ready = React.useRef<ReadyState>(0);
  const authenticated = React.useRef(false);
  const wrongToken = React.useRef(false);
  const env = client.getEnv?.();
  const onError = client.onError || defaultOnError;
  const socketUrl = getServerWsUrl(env);

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

  const connect = !(token === undefined || wrongToken.current);
  const { sendMessage: sendMessageOrig, lastMessage, readyState, getWebSocket } = useWebSocket(
    socketUrl,
    opts,
    connect
  );
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

  const sendMessage = React.useCallback(
    (message: FogSchema["outbound"]) => {
      const socketIsOpen = ready.current === ReadyState.OPEN;
      const isAuthMessage = message.msgType === "Auth.Agent" || message.msgType === "Auth.User";
      if (socketIsOpen && (authenticated.current || isAuthMessage)) {
        const buffer = queue.current;
        queue.current = [];
        if (isAuthMessage) {
          buffer.unshift(message);
        } else {
          buffer.push(message);
        }

        buffer.forEach(m => {
          const data = "binaryData" in m ? serialize(m) : JSON.stringify(m);
          sendMessageOrig(data);
        });
      } else {
        queue.current.push(message);
      }
    },
    [sendMessageOrig]
  );

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

  const authenticating = React.useRef(false);
  React.useEffect(() => {
    onError("other", "other", ReadyState[readyState]);

    if (
      token &&
      !authenticating.current &&
      !authenticated.current &&
      readyState === ReadyState.OPEN
    ) {
      if ("widgetId" in token) {
        authenticating.current = true;
        serverCall({
          ...token,
          msgType: "Auth.User",
          widgetId: token.widgetId,
        }).then(
          r => {
            authenticating.current = false;
            if (r.msgType === "Auth.Ok") {
              const { sessionId, userId, helpdeskId } = r;
              authenticated.current = true;
              setHelpdesk(r.helpdesk);
              client.setSession?.(sessionId, userId, helpdeskId);
            } else if (r.msgType === "Auth.Err") {
              if (r.code === 401 || r.code === 403) {
                onWrongToken(token);
              }
            }
          },
          r => {
            authenticating.current = false;
            onError("error", "other", r);
          }
        );
      } else if ("agentId" in token) {
        authenticating.current = true;
        fetch(`${getServerApiUrl(env)}/token`, {
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
                authenticating.current = false;
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
                authenticating.current = false;
                onError("error", "other", r);
              }
            );
          })
          .catch(error => {
            authenticating.current = false;
            throw new Error(error);
          });
      }
    }
  }, [readyState, serverCall, token, client]);

  React.useEffect(() => {
    return () => {
      authenticated.current = false;
      wrongToken.current = false;
      setHelpdesk(undefined);
      getWebSocket()?.close();
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
  return { serverCall, lastIncomingMessage, respondToMessage, helpdesk };
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
