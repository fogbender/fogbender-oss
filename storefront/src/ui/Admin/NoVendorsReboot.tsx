import classNames from "classnames";
import { CgHashtag as Hashtag } from "react-icons/cg";
import {
  ThickButton,
  ThinButton,
  useInputWithError,
  Icons,
  IconSlack,
  IconGitHub,
} from "fogbender-client/src/shared";
import React from "react";
import { useSelector } from "react-redux";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PiCheckThin } from "react-icons/pi";
import { useAtom } from "jotai";

import { AddSlackIntegration, ShowSlackIntegration } from "./Integrations/Slack";
import { AddGitHubIntegration, ShowGitHubIntegration } from "./Integrations/GitHub";
import { OnboardingNavControls } from "./OnboardingNavControls";
import { HighlightCode } from "./HighlightCode";
import { useWorkspaceIntegrationsQuery } from "../useWorkspaceIntegrations";
import { apiServer, fetchData, queryKeys, queryClient } from "../client";
import { type Workspace } from "../../redux/adminApi";
import { selectUserName } from "../../redux/session";
import { getClientUrl, getWidgetDemoUrl } from "../../config";

import { AssistantConfig } from "./AssistantConfig";

import {
  // Link,
  // Navigate,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigate,
  // useParams,
  useSearchParams,
} from "react-router-dom";

import { HeadlessForSupport } from "./HeadlessForSupport";

import { onboardingStateAtom } from "./OnboardingTypes";

const clientUrl = getClientUrl();

function b64EncodeUnicode(str: string) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (_match, p1) {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
}

export function isObject(x: any) {
  return typeof x === "object" && !Array.isArray(x) && x !== null;
}

export const NoVendorsReboot = ({
  onDone,
  setOnboardingSteps,
}: {
  onDone: () => void;
  setOnboardingSteps: (x: React.ReactNode) => void;
}) => {
  const navigate = useNavigate();
  const onboardingMatch = useMatch("/admin/vendor/:vid/onboarding/:section");
  const section = onboardingMatch?.params?.section;
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);

  const workspaces = useWorkspaces();

  React.useEffect(() => {
    if (!onboardingState.workspaceId && workspaces.length !== 0) {
      const workspace = workspaces[0];
      setOnboardingState(s => ({
        ...s,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspace,
      }));
    }
  }, [onboardingState, workspaces]);

  const [step, setStep] = React.useState(
    (() => {
      if (!section) {
        return 1;
      }

      if (section === "formalities") {
        return 1;
      } else if (section === "slack") {
        return 2;
      } else if (section === "github") {
        return 3;
      } else if (section === "llm") {
        return 4;
      } else if (section === "widget") {
        return 5;
      }

      return 1;
    })()
  );

  const onNext = () => setStep(x => x + 1);
  const onPrev = () => setStep(x => x - 1);

  React.useEffect(() => {
    setOnboardingSteps(
      <div className="mt-8 mb-4 w-full lg:w-min text-black dark:text-white">
        <div className="flex justify-around w-full lg:w-min">
          <ul className="font-medium w-full steps steps-vertical lg:steps-horizontal">
            <li onClick={() => setStep(1)} className="step step-primary w-36 text-sm">
              Formalities
            </li>
            <li
              onClick={() => setStep(2)}
              className={classNames(
                "step w-36 whitespace-nowrap text-sm",
                step > 1 && "step-primary"
              )}
            >
              Connect Slack
            </li>
            <li
              onClick={() => setStep(3)}
              className={classNames(
                "step w-36 whitespace-nowrap text-sm",
                step > 2 && "step-primary"
              )}
            >
              Connect GitHub
            </li>
            <li
              onClick={() => setStep(4)}
              className={classNames(
                "step w-36 whitespace-nowrap text-sm",
                step > 3 && "step-primary"
              )}
            >
              Create Assistant
            </li>
            <li
              onClick={() => setStep(5)}
              className={classNames(
                "step w-36 whitespace-nowrap text-sm",
                step > 4 && "step-primary"
              )}
            >
              Install widget
            </li>
          </ul>
        </div>
      </div>
    );
  }, [step]);

  const { vendorId: stateVendorId } = onboardingState;

  const vendorId = stateVendorId ?? "new";

  const location = useLocation();

  const search = location?.search;

  React.useEffect(() => {
    if (!section) {
      navigate(`/admin/vendor/${vendorId}/onboarding/formalities`);
    }

    if (step === 1) {
      navigate(`/admin/vendor/${vendorId}/onboarding/formalities${search}`);
    } else if (step === 2) {
      navigate(`/admin/vendor/${vendorId}/onboarding/slack${search}`);
    } else if (step === 3) {
      navigate(`/admin/vendor/${vendorId}/onboarding/github${search}`);
    } else if (step === 4) {
      navigate(`/admin/vendor/${vendorId}/onboarding/llm${search}`);
    } else if (step === 5) {
      navigate(`/admin/vendor/${vendorId}/onboarding/widget${search}`);
    }
  }, [step, navigate, section, vendorId]);

  return (
    <div className="h-full flex flex-col pb-32 sm:pb-0 text-black dark:text-white">
      {vendorId && <HeadlessForSupport vendorId={vendorId} hideFloatie={false} hideBadge={true} />}

      {vendorId && (
        <div
          onClick={() => {
            onDone();
          }}
          className="fixed right-5 top-[26rem] lg:top-[8.5rem] text-slate-400 hover:text-brand-red-500 cursor-pointer"
          title="Exit onboarding"
        >
          <Icons.XClose className="w-4" />
        </div>
      )}

      <Routes>
        <Route path="formalities" element={<Step1 onNext={onNext} />} />
        <Route path="slack" element={<Step2 onNext={onNext} onPrev={onPrev} />} />
        <Route path="github" element={<Step3 onNext={onNext} onPrev={onPrev} />} />
        <Route path="llm" element={<Step4 onNext={onNext} onPrev={onPrev} />} />
        <Route path="widget" element={<Step5 onDone={onDone} onPrev={onPrev} />} />
      </Routes>
    </div>
  );
};

export const Step6 = ({ onDone }: { onDone: () => void }) => {
  const { onboardingState } = useOnboardingStateWithSlack();

  const [isLoading] = React.useState(false);

  return (
    <div className="fog:text-body-m mt-8 flex flex-col gap-y-4 pr-16 dark:text-white my-4 max-w-screen-md w-full">
      <h1 className="fog:text-header2">👩‍🚀</h1>
      <table className="table table-sm">
        <tbody>
          <TableRow item={"Fogbender organization"} value={onboardingState.vendorName} />
          <TableRow item={"Fogbender workspace"} value={onboardingState.workspaceName} />
          {onboardingState.slackConfigured && (
            <>
              <TableRow item={"Slack workspace"} value={onboardingState.slackWorkspaceName} />
              <TableRow
                item={"Slack channel"}
                value={
                  <span className="flex items-center gap-px">
                    <Hashtag size={18} />
                    <span>{onboardingState.slackChannelName}</span>
                  </span>
                }
              />
            </>
          )}
        </tbody>
      </table>
      <ThickButton
        disabled={isLoading}
        className="mt-20 w-36"
        onClick={() => {
          onDone();
        }}
      >
        <div className="flex items-center gap-2">
          <span>Continue </span>
          {isLoading ? <span className="loading loading-ring loading-sm"></span> : <span>→</span>}
        </div>
      </ThickButton>
    </div>
  );
};

const useOnboardingStateWithSlack = () => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);

  const { workspaceId } = onboardingState;

  const { data: integrations } = useWorkspaceIntegrationsQuery(workspaceId);

  const slackIntegration = (integrations ?? []).find(i => i.type === "slack");

  const setSlackIntegration = () => {
    if (slackIntegration) {
      setOnboardingState(s => ({
        ...s,
        slackConfigured: true,
        slackWorkspaceId: slackIntegration.project_id,
        slackWorkspaceName: slackIntegration.project_name,
        slackChannelId: slackIntegration.linked_channel_id,
        slackChannelName: slackIntegration.linked_channel_name,
      }));
    }
  };

  React.useEffect(() => {
    setSlackIntegration();
  }, [slackIntegration]);

  return { slackIntegration, setSlackIntegration, onboardingState };
};

const useOnboardingStateWithGitHub = () => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);

  const { workspaceId } = onboardingState;

  const { data: integrations } = useWorkspaceIntegrationsQuery(workspaceId);

  const gitHubIntegration = (integrations ?? []).find(i => i.type === "github");

  const setGitHubIntegration = () => {
    if (gitHubIntegration) {
      setOnboardingState(s => ({
        ...s,
        gitHubConfigured: true,
      }));
    }
  };

  React.useEffect(() => {
    setGitHubIntegration();
  }, [gitHubIntegration]);

  return { gitHubIntegration, setGitHubIntegration, onboardingState };
};

export interface MutationHandler {
  key: string;
  mutate: () => void;
}

type FileAliceBob = "file" | "alice" | "bob";

const SlackStuff = ({ workspace }: { workspace: Workspace }) => {
  const { slackIntegration, setSlackIntegration } = useOnboardingStateWithSlack();

  return slackIntegration ? (
    <ShowSlackIntegration
      i={slackIntegration}
      onDeleted={() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.integrations(workspace.id) });
      }}
    />
  ) : (
    <AddSlackIntegration
      workspace={workspace}
      onDone={() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.integrations(workspace.id) });
        setSlackIntegration();
      }}
      closing={false}
    />
  );
};

const GitHubStuff = ({
  workspace,
  installationId,
}: {
  workspace: Workspace;
  installationId: null | string;
}) => {
  const { gitHubIntegration, setGitHubIntegration } = useOnboardingStateWithGitHub();

  return gitHubIntegration ? (
    <ShowGitHubIntegration
      i={gitHubIntegration}
      onDeleted={() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.integrations(workspace.id) });
      }}
    />
  ) : (
    <AddGitHubIntegration
      workspace={workspace}
      installationId={installationId}
      onDone={() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.integrations(workspace.id) });
        setGitHubIntegration();
      }}
      closing={false}
      context="onboarding"
    />
  );
};

const Step2 = ({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) => {
  const [onboardingState] = useAtom(onboardingStateAtom);
  const { slackIntegration } = useOnboardingStateWithSlack();

  useWorkspaces();

  return (
    <div className="fog:text-body-m mt-8 flex flex-col gap-y-4 pr-16 dark:text-white my-4 max-w-screen-md w-full">
      <div>
        <h1 className="fog:text-header2 flex items-center gap-3">
          <IconSlack />
          Connect Slack
        </h1>
        <p className="font-semibold">Respond to in-app multiplayer chat widget users from Slack</p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-12">
        {onboardingState.workspace && <SlackStuff workspace={onboardingState.workspace} />}
      </div>
      <OnboardingNavControls
        nextDisabled={!slackIntegration}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onNext}
      />
    </div>
  );
};

const Step3 = ({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) => {
  const [onboardingState] = useAtom(onboardingStateAtom);
  const { gitHubIntegration } = useOnboardingStateWithGitHub();

  useWorkspaces();

  const [searchParams] = useSearchParams();

  const installationId = searchParams.get("installation_id");

  return (
    <div className="fog:text-body-m mt-8 flex flex-col gap-y-4 pr-16 dark:text-white my-4 max-w-screen-md w-full">
      <div>
        <h1 className="fog:text-header2 flex items-center gap-3">
          <IconGitHub />
          Connect GitHub issues
        </h1>
        <p className="font-semibold">
          Record customer complaints and requests in a developer-facing issue tracker
        </p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-12">
        {onboardingState.workspace && (
          <GitHubStuff workspace={onboardingState.workspace} installationId={installationId} />
        )}
      </div>

      <OnboardingNavControls
        nextDisabled={!gitHubIntegration}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onNext}
      />
    </div>
  );
};

const Step4 = ({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }) => {
  return <AssistantConfig onNext={onNext} onPrev={onPrev} onSkip={onNext} />;
};

const Step5 = ({ onDone, onPrev }: { onDone: () => void; onPrev: () => void }) => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);
  const widgetDemoUrl = getWidgetDemoUrl();
  const { vendorName, workspaceId } = onboardingState;

  const { data: widgetData } = useQuery({
    queryKey: queryKeys.widgetData(workspaceId as string),
    queryFn: async () =>
      fetchData<{
        widget_id: string;
        widget_key: string;
        visitor_key: string;
      }>(`api/workspaces/${workspaceId}/signature_secret`),
    enabled: !!workspaceId,
  });

  const widgetId = widgetData?.widget_id;
  const widgetKey = widgetData?.widget_key;
  const visitorKey = widgetData?.visitor_key;

  React.useEffect(() => {
    if (widgetId && widgetKey) {
      setOnboardingState(s => ({ ...s, widgetId, widgetKey }));
    }
  }, [widgetId, widgetKey]);

  // http://localhost:3200/login?override=true&widgetId=dzAwNTU0Mzk4OTU3ODc5NDMxMTY4&widgetKey=06c42645d41d8c94c6a&vendorName=AA1&visitorKey=SqmPWQM99qzEw3jUc5xcxMCduIWwguJV

  // http://localhost:3200/login-redirect?override=true&redirectUrl=%2Flogin&customerId=marin-farm-llc&customerName=Marin+Farm+LLC&userId=Marina+Collins&userEmail=marina%2Bcollins%2Bmarin-farm-llc%40example.com&userName=Marina+Collins

  const params = React.useCallback(
    (userName: string) => {
      if (widgetId && widgetKey) {
        const p = new URLSearchParams([["override", "true"]]);
        p.set("widgetId", widgetId);
        p.set("widgetKey", widgetKey);
        if (vendorName) {
          p.set("vendorName", vendorName);
        }
        if (visitorKey) {
          p.set("visitorKey", visitorKey);
        }
        p.set("customerId", "fogbender-widget-demo");
        p.set("customerName", "Alice & Bob’s LLM Repair");
        p.set("userId", userName);
        p.set("userName", userName);
        p.set("userEmail", `${userName}@example.com`);
        return p;
      }
      return "";
    },
    [widgetId, widgetKey, visitorKey, vendorName]
  );

  const aliceDemoUrl = `${widgetDemoUrl}/login?${params("Alice")}`;
  const bobDemoUrl = `${widgetDemoUrl}/login?${params("Bob")}`;

  const ourHost = window.location.protocol + "//" + window.location.host;
  const settingsUrl = `${ourHost}/admin/-/-/settings/embed`;

  const htmlText = `<!doctype html>
<html lang="en" style="height: 100%;">
  <head>
    <meta charset="UTF-8" />
    <script async src="${clientUrl}/loader.js"></script>
    <script>
      !function(e){var n="fogbender",o=new Proxy({_queue:[],_once:!1},{get:function(e,o){var r=e["_"+n];return"_"===o[0]?e[o]:r?r[o]:function(){var n=arguments;return new Promise((function(r,u){e._queue.push([o,n,r,u])}))}}}),r=e[n]=e[n]||o;r._once?console.error(n+" snippet included twice."):(r._once=!0,r.setVersion("snippet","0.2.0"))}(window);
    </script>
  </head>
  <body style="margin: 0; height: 100%;">
    <div id="chat-widget" />
    <script>
        const token = {
            widgetId: "${widgetId}",
            widgetKey: "${widgetKey}",
            customerId: "C256434",
            customerName: "Hogwarts",
            userId: "U234328",
            userEmail: "hpotter@example.com",
            userName: "Harry Potter", // Don’t know the name? Reuse email here
            userAvatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Garfield" // optional
        };

        fogbender.setClientUrl("${clientUrl}")
        fogbender.setToken(token);
        fogbender.setMode("light");

        const rootEl = document.getElementById("chat-widget");
        fogbender.renderIframe({ rootEl });
    </script>
  </body>
</html>`;

  const [continueLevel, setContinueLevel] = React.useState<Set<FileAliceBob>>(new Set([]));
  const [nudge, setNextNudge] = React.useState<FileAliceBob>();

  /*
  const playRecordingMutation = useMutation({
    mutationFn: async () => {
      return apiServer.url(`/multiplayer-demo-dialog/play`).post({ workspaceId }).text();
    },
  });

  const stopReplayMutation = useMutation({
    mutationFn: async () => {
      return apiServer.url(`/multiplayer-demo-dialog/stop`).post({ workspaceId }).text();
    },
  });

  const clearRecordingMutation = useMutation({
    mutationFn: async () => {
      return apiServer.url(`/multiplayer-demo-dialog/clear`).post({ workspaceId }).text();
    },
  });
  */

  return (
    <div className="fog:text-body-m mt-8 flex flex-col gap-y-4 pr-16 dark:text-white my-4 w-full">
      <h1 className="fog:text-header2">Install chat widget</h1>

      <div className="flex-col md:flex-row flex w-full gap-8">
        <div className="max-w-screen-md">
          <p className="mb-2">
            Below is the simplest possible widget as a standalone HTML page&mdash;you can run it
            directly from your filesystem or web application bundle.
          </p>

          <HighlightCode className="max-w-screen-md rounded language-html text-xs">
            {htmlText}
          </HighlightCode>
        </div>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="font-bold">Try standalone widget</div>
            <span
              className={classNames(
                "flex items-center gap-2",
                nudge === "file" && !continueLevel.has("file") && "font-bold"
              )}
            >
              <span className="hidden md:block text-2xl">👈</span>
              <span className="md:hidden text-2xl">☝️</span>
              <span>
                <a
                  onClick={() => {
                    setOnboardingState(s => ({ ...s, fileDownloaded: true }));
                    setContinueLevel(s => new Set(s.add("file")));
                  }}
                  className="fog:text-link"
                  href={`data:application/octet-stream;charset=utf-16le;base64,${b64EncodeUnicode(
                    htmlText
                  )}`}
                  download="fogbender-widget.html"
                >
                  Download this file
                </a>{" "}
                <span>(then open it!)</span>
              </span>
              {continueLevel.has("file") && <PiCheckThin className="text-green-500" size={20} />}
            </span>
            <div className="font-bold">Try multiplayer chat</div>
            <div
              className={classNames(
                "flex items-center gap-2",
                nudge === "alice" && !continueLevel.has("alice") && "font-bold"
              )}
              onClick={() => {
                setOnboardingState(s => ({ ...s, aliceOpened: true }));
                setContinueLevel(s => new Set(s.add("alice")));
              }}
            >
              <DemoAnchor href={aliceDemoUrl}>
                <span className="flex gap-2 items-center">
                  <img
                    height={28}
                    width={28}
                    src="https://api.dicebear.com/7.x/pixel-art/svg?seed=1710177407796"
                    alt="Alice"
                  />
                  <span>Open widget as Alice</span>
                </span>
              </DemoAnchor>
              {continueLevel.has("alice") && <PiCheckThin className="text-green-500" size={20} />}
            </div>
            <div
              className={classNames(
                "flex items-center gap-2",
                nudge === "bob" && !continueLevel.has("bob") && "font-bold"
              )}
              onClick={() => {
                setOnboardingState(s => ({ ...s, bobOpened: true }));
                setContinueLevel(s => new Set(s.add("bob")));
              }}
            >
              <DemoAnchor href={bobDemoUrl}>
                <span className="flex gap-2 items-center">
                  <img
                    height={28}
                    width={28}
                    src="https://api.dicebear.com/7.x/pixel-art/svg?seed=1710177442228"
                    alt="Alice"
                  />
                  <span>Open widget as Bob</span>
                </span>
              </DemoAnchor>
              {continueLevel.has("bob") && <PiCheckThin className="text-green-500" size={20} />}
            </div>
            {/*
            <button
              onClick={() => {
                playRecordingMutation.mutate();
              }}
              className="fog:text-link self-start"
            >
              Play recording
            </button>
            <button
              onClick={() => {
                stopReplayMutation.mutate();
              }}
              className="fog:text-link self-start"
            >
              Stop replay
            </button>
            <button
              onClick={() => {
                clearRecordingMutation.mutate();
              }}
              className="fog:text-link self-start"
            >
              Clear history
            </button>
            */}
            <p>
              The chat widget will adapt to the alotted space. By specifying the same{" "}
              <code>customerId</code>/<code>customerName</code> for several users, you can make the
              widget multiplayer. Open the two links above side by side for a demo.
            </p>
          </div>
          <div className="flex flex-col gap-4 max-w-screen-sm">
            <div className="font-bold">Important</div>
            <ul className="ml-4 list-disc space-y-4">
              <li>
                The example on the left uses the Script Tag loader. To learn about other
                installation methods and widget types, see{" "}
                <a className="fog:text-link" href="/docs" target="_blank" rel="noopener">
                  Fogbender Docs
                </a>
                .
              </li>
              <li>
                Using demos from this page in production <b>isn’t secure</b>&mdash;make sure to
                secure your token by following the instructions in Step 2 on{" "}
                <a className="fog:text-link" href={settingsUrl}>
                  Embedding Instructions
                </a>
                .
              </li>
            </ul>
          </div>
          <div className="flex gap-5">
            <ThickButton
              className="w-36 min-w-36"
              onClick={() => {
                const { fileDownloaded, aliceOpened, bobOpened } = onboardingState;

                if (fileDownloaded && aliceOpened && bobOpened) {
                  onDone();
                  return;
                }

                const nextNudge = (["file", "alice", "bob"] as FileAliceBob[]).find(
                  e => !continueLevel.has(e)
                );

                if (!nextNudge) {
                  onDone();
                } else {
                  setNextNudge(nextNudge);
                }
              }}
            >
              Continue →
            </ThickButton>
            {nudge === "file" && !continueLevel.has("file") && (
              <div>
                Woops! You forgot to download the file <span className="text-xl">😉</span>
              </div>
            )}
            {nudge === "alice" && !continueLevel.has("alice") && (
              <div>
                Oh no! Do make sure to check out the widget as Alice{" "}
                <span className="ml-1 text-xl">🧐</span>
              </div>
            )}
            {nudge === "bob" && !continueLevel.has("bob") && (
              <div>
                Almost there! Please please open Bob’s widget and say hi to Alice
                <span className="ml-1 text-xl">😻</span>
              </div>
            )}
          </div>
          <ThinButton
            className="self-start w-36 h-11"
            onClick={() => {
              onPrev();
            }}
          >
            ← Back
          </ThinButton>
        </div>
      </div>
    </div>
  );
};

const DemoAnchor = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noopener" className={classNames("fog:text-link")}>
    {children}
  </a>
);

const Step1 = ({ onNext }: { onNext: () => void }) => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);
  const { data: potentialNameData, isPending: gimmeNamePending } = useQuery({
    queryKey: ["potential_name"],
    queryFn: async () => fetchData<{ name: string }>("api/vendors/gimme-vendor-name"),
    staleTime: Infinity,
    enabled: !!onboardingState.vendorName === false,
  });

  const userName = useSelector(selectUserName);

  const [orgNameError, setOrgNameError] = React.useState<string>();

  const newWorkspaceMutation = useMutation({
    mutationFn: async ({ vendorId, name = "Test" }: { vendorId: string; name?: string }) => {
      return apiServer
        .url(`/api/vendors/${vendorId}/workspaces`)
        .post({ name })
        .json<{ id: string; name: string }>();
    },
    onSuccess: (res, params) => {
      if (res.id) {
        const { vendorId } = params;
        queryClient.invalidateQueries({ queryKey: queryKeys.workspaces(vendorId) });
        setOnboardingState(s => ({ ...s, workspaceId: res.id, workspaceName: res.name }));
      }
      onNext();
    },
  });

  const newVendorMutation = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      return apiServer.url("/api/vendors").post({ name }).json<{ id: string; name: string }>();
    },
    onSuccess: res => {
      const { id, name } = res;
      setOnboardingState(s => ({ ...s, vendorId: id, vendorName: name }));
      newWorkspaceMutation.mutate({ vendorId: id, name: workspaceNameValue || "Test" });
    },
    onError: error => {
      setOrgNameError(error?.message);
    },
  });

  const formLoading = newWorkspaceMutation.isPending || newVendorMutation.isPending;

  const [orgNameValue, orgNameField] = useInputWithError({
    title: "Your company or product name",
    defaultValue: onboardingState.vendorName ?? potentialNameData?.name,
    error: orgNameError,
    disabled: formLoading || gimmeNamePending || !!newVendorMutation.data,
  });

  const [workspaceNameValue, workspaceNameField] = useInputWithError({
    title: "Your workspace name",
    defaultValue: onboardingState.workspaceName || "Test",
    error: newVendorMutation.error?.message?.toString(),
    disabled: formLoading,
  });

  const onSubmit = React.useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      e?.preventDefault();
      if (!onboardingState.vendorId && !onboardingState.workspaceId) {
        const trimmedOrgName = orgNameValue.trim();

        if (trimmedOrgName.length === 0) {
          setOrgNameError("Can't be blank");
          return;
        }
        newVendorMutation.mutate({ name: trimmedOrgName });
      } else {
        onNext();
      }
    },
    [orgNameValue]
  );

  return (
    <div className="fog:text-body-m mt-8 flex max-w-screen-md flex-col gap-y-4 pr-16 dark:text-white">
      <div>
        <h1
          className={classNames(
            "fog:text-header2 opacity-0",
            userName.length > 0 && "opacity-100 transition-opacity duration-400"
          )}
        >
          {userName.split(/\s+/)[0]}—hello!
        </h1>
        <p className="font-semibold">
          Fogbender is a new way to embed a multiplayer (B2B) messaging experience inside your web
          app in two shakes of a <span className="text-2xl leading-none">🐑</span>’s tail.
        </p>
      </div>
      <form
        className={classNames(
          "fog:box-shadow my-4 flex flex-col gap-y-4 rounded-xl bg-white dark:bg-brand-dark-bg p-6 border border-transparent dark:border-slate-500"
        )}
        onSubmit={onSubmit}
      >
        {orgNameField}
        <p className="-mt-3 mb-2">Your users will see this name. You can change it later.</p>
        {workspaceNameField}
        <p className="-mt-3 mb-2">
          A workspace is a dedicated space for your users. Workspaces are used to distinguish
          between your products or product environments (e.g., production, staging). You can change
          this name and create more workspaces later.
        </p>
        <p>
          <ThickButton
            className="w-36"
            onClick={onSubmit}
            loading={formLoading}
            disabled={!(potentialNameData?.name || onboardingState.workspaceName)}
          >
            <div className="flex items-center gap-2">
              <span>Continue </span>
              {gimmeNamePending ? (
                <span className="loading loading-ring loading-sm"></span>
              ) : (
                <span>→</span>
              )}
            </div>
          </ThickButton>
        </p>
      </form>
    </div>
  );
};

const TableRow = ({ item, value }: { item: React.ReactNode; value: React.ReactNode }) => {
  return (
    <tr>
      <td>{item}</td>
      <td className="font-semibold">{value}</td>
    </tr>
  );
};

const useWorkspaces = () => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);

  const { data: workspaces } = useQuery<Workspace[]>({
    queryKey: queryKeys.workspaces(onboardingState.vendorId),
    queryFn: async () =>
      fetchData<Workspace[]>(`api/vendors/${onboardingState.vendorId}/workspaces`),
    initialData: [],
    enabled: !!onboardingState.vendorId && onboardingState.workspaceId === undefined,
  });

  React.useEffect(() => {
    if (onboardingState.workspaceId && !onboardingState.workspace) {
      const workspace = workspaces.find(w => w.id === onboardingState.workspaceId);

      if (workspace) {
        setOnboardingState(s => ({
          ...s,
          workspace,
          workspaceId: workspace.id,
        }));
      }
    }
  }, [onboardingState, workspaces]);

  return workspaces;
};
