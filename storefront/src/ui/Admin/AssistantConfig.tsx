import dayjs from "dayjs";

import relativeTime from "dayjs/plugin/relativeTime";
import classNames from "classnames";

import React from "react";

import { useAtom } from "jotai";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useMatch } from "react-router-dom";

import { apiServer, queryClient } from "../client";

import { ThickButton, useInputWithError } from "fogbender-client/src/shared";

import { GoDotFill } from "react-icons/go";
import { BiLinkExternal } from "react-icons/bi";

import { onboardingStateAtom, llmProviders, type LlmProvider } from "./OnboardingTypes";
import { OnboardingNavControls } from "./OnboardingNavControls";

import { ExpandableSection } from "./ExpandableSection";

dayjs.extend(relativeTime);

export const ExpandableAssistantConfig = () => {
  return (
    <ExpandableSection title="Assistant" expand={true}>
      <AssistantConfig showHeader={false} />
    </ExpandableSection>
  );
};

export const AssistantConfig = ({
  onNext,
  onPrev,
  onSkip,
  showHeader = true,
}: {
  onNext?: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  showHeader?: boolean;
}) => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);
  const [provider, setProvider] = React.useState<LlmProvider>(onboardingState.provider ?? "OpenAI");

  const workspaceMatch = useMatch("/admin/vendor/:vid/workspace/:wid/*");
  const workspaceId = workspaceMatch?.params?.wid;

  React.useEffect(() => {
    if (workspaceId) {
      setOnboardingState(s => ({
        ...s,
        workspaceId,
      }));
    }
  }, [workspaceId]);

  const onSelection = (selection: string) => {
    setProvider(selection);
    setOnboardingState(s => ({ ...s, provider: selection }));

    const activeElement = document?.activeElement;

    if (activeElement) {
      if ("blur" in activeElement && typeof activeElement.blur === "function") {
        (activeElement as { blur: () => void }).blur();
      }
    }
  };

  React.useEffect(() => {
    if (provider) {
      setOnboardingState(s => ({ ...s, provider }));
    }
  }, [provider]);

  return (
    <div className="fog:text-body-m mt-8 flex flex-col gap-y-4 pr-16 dark:text-white my-4 max-w-screen-md w-full">
      {showHeader && (
        <h1 className="fog:text-header2">
          Create Assistant<sub className="ml-1 font-bold text-sm text-slate-500">β</sub>
        </h1>
      )}

      <div className="flex flex-col sm:flex-row gap-12">
        <div className="min-w-max border-r-0 sm:border-r pr-0 sm:pr-4 dark:border-r-slate-700">
          <div className="space-x-4 sm:space-x-0 sm:space-y-8 cursor-pointer font-semibold flex flex-row sm:flex-col">
            {llmProviders.map(p => (
              <div key={p} onClick={() => onSelection(p)}>
                <a
                  className={classNames(
                    "fog:text-link no-underline flex items-center gap-1",
                    provider === p && "!text-brand-orange-500"
                  )}
                >
                  <div className={classNames(provider === p ? "visible" : "invisible")}>
                    <GoDotFill size={11} />
                  </div>
                  {p}
                </a>
              </div>
            ))}
          </div>
        </div>

        {(() => {
          if (provider === "OpenAI") {
            return <OpenAI onNext={onNext} onPrev={onPrev} onSkip={onSkip} />;
          } else if (provider === "What’s LLM?") {
            return (
              <div className="flex flex-col gap-4">
                <p>
                  “LLM” means{" "}
                  <a
                    className="fog:text-link"
                    target="_blank"
                    href="https://en.wikipedia.org/wiki/Large_language_model"
                    rel="noopener"
                  >
                    “Large language model”
                  </a>
                  &mdash;you can connect such a model to the embedded chat widget you configured in
                  the previous step, so your users can chat with a know-it-all artificial friend who
                  never sleeps.
                </p>
                <p>
                  If you’re interested in human-only interactions, you can safely skip LLM setup for
                  now and do it later, should you change your mind.
                </p>
                <ThickButton className="max-w-max" onClick={onNext}>
                  Skip LLM setup →
                </ThickButton>
              </div>
            );
          } else if (provider && llmProviders.includes(provider)) {
            return `Support for ${provider} is coming soon!`;
          } else {
            return null;
          }
        })()}
      </div>
    </div>
  );
};

const OpenAI = ({
  onNext,
  onPrev,
  onSkip,
}: {
  onNext?: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
}) => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);
  const { apiKeys, workspaceId } = onboardingState;
  const [apiKey, apiKeyField] = useInputWithError({
    defaultValue: apiKeys["OpenAI"],
    type: "password",
    title: "Enter your OpenAI API key here",
  });

  const {
    data: knownAssistantsData,
    refetch: refetchAssistants,
    error: knownAssistantsError,
    isLoading: knownAssistantsLoading,
  } = useQuery({
    queryKey: [workspaceId, "llm_assistants"],
    queryFn: async () => {
      return await apiServer
        .url(`/api/workspaces/${workspaceId}/llm`)
        .query({ provider: "OpenAI" })
        .get()
        .json<Assistant[]>();
    },
    initialData: [],
    enabled: !!workspaceId,
  });

  const [selectedAssistantId, setSelectedAssistantId] = React.useState<string | null>(null);
  const openAiSelectedAssistantId = onboardingState.assistantIds["OpenAI"];

  React.useEffect(() => {
    if (openAiSelectedAssistantId) {
      setSelectedAssistantId(openAiSelectedAssistantId);
    }
  }, [openAiSelectedAssistantId]);

  React.useEffect(() => {
    if (!!apiKey && apiKey !== apiKeys["OpenAI"]) {
      setOnboardingState(s => ({ ...s, apiKeys: { ...s.apiKeys, "OpenAI": apiKey } }));
      refetchAssistants();
    }
  }, [apiKey]);

  React.useEffect(() => {
    if (selectedAssistantId) {
      setOnboardingState(s => ({
        ...s,
        assistantIds: { ...s.assistantIds, "OpenAI": selectedAssistantId },
      }));
    }
  }, [selectedAssistantId]);

  const createOpenAiAssistantMutation = useMutation({
    mutationFn: async () =>
      apiServer
        .url(`/api/workspaces/${workspaceId}/llm/OpenAI/assistants`)
        .headers({ "openai-api-key": apiKey })
        .post()
        .text(),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: [workspaceId, "llm_assistants"],
        });
      }
    },
  });

  const knownAssistants = knownAssistantsData;

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ assistantId }: { assistantId: string }) =>
      apiServer
        .url(`/api/workspaces/${workspaceId}/llm/assistants/${assistantId}`)
        .headers({ "openai-api-key": apiKey })
        .patch({ toggle: "enabled", provider: "OpenAI" })
        .text(),
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: [workspaceId, "llm_assistants"],
        });
      }
    },
  });

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentMonth = monthNames[new Date().getMonth()];

  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-4">
      <div>
        At the moment, Fogbender only supports the{" "}
        <a
          className="fog:text-link"
          target="_blank"
          rel="noopener"
          href="https://platform.openai.com/docs/assistants/overview"
        >
          OpenAI Assistants API
        </a>{" "}
        (in Beta as of {currentMonth} {currentYear}).
      </div>
      <div>
        We’ll need your OpenAI API key to create your Support Assistant and to communicate with it
        on your behalf. We recommend{" "}
        <a
          className="fog:text-link"
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener"
        >
          creating a brand new API key
        </a>
        &mdash;restricted to <b>Assistants</b> in <b>Write</b> mode.
      </div>
      <div className="flex gap-2 items-center">{apiKeyField}</div>
      {knownAssistantsLoading && (
        <div className="flex flex-col gap-4 w-52">
          <div className="skeleton h-4 w-28"></div>
          <div className="skeleton h-4 w-full"></div>
          <div className="skeleton h-4 w-full"></div>
        </div>
      )}

      <div className="mt-6">
        <ThickButton
          disabled={!apiKey}
          className="max-w-min"
          onClick={() => {
            if (apiKey) {
              createOpenAiAssistantMutation.mutate();
            }
          }}
        >
          Create&nbsp;Assistant
        </ThickButton>
      </div>

      {!knownAssistantsError && knownAssistants && (
        <div className="flex flex-col gap-2">
          <>
            <span className="font-semibold mt-4">Your assistants</span>
            <AssistantsTable
              data={knownAssistants}
              isToggling={toggleEnabledMutation.isPending}
              toggleEnabled={(a, onToggled) =>
                toggleEnabledMutation.mutate(
                  { assistantId: a.id },
                  {
                    onSuccess: () => {
                      onToggled();
                    },
                  }
                )
              }
              manageUrl={a => `https://platform.openai.com/assistants/${a.id}`}
              playgroundUrl={a =>
                `https://platform.openai.com/playground?mode=assistant&assistant=${a.id}`
              }
            />
          </>
          {onNext && (
            <OnboardingNavControls
              nextDisabled={!apiKey && !selectedAssistantId && knownAssistants.length === 0}
              onNext={onNext}
              onPrev={onPrev}
              onSkip={onSkip}
            />
          )}
        </div>
      )}
    </div>
  );
};

const AssistantsTable = ({
  data,
  isToggling,
  toggleEnabled,
  onClick,
  manageUrl,
  playgroundUrl,
}: {
  data: Assistant[];
  isToggling: boolean;
  toggleEnabled: (x: Assistant, y: () => void) => void;
  onClick?: (x: Assistant) => void;
  manageUrl: (x: Assistant) => string;
  playgroundUrl: (x: Assistant) => string;
}) => {
  const [togglingId, setTogglingId] = React.useState<null | string>(null);
  return (
    <table className="table table-xs">
      <thead>
        <tr>
          <th>Enabled</th>
          <th>Name</th>
          <th>ID</th>
          <th>Version</th>
          <th>API key</th>
          <th>Created</th>
          <th>Manage</th>
          <th>Playground</th>
        </tr>
      </thead>
      <tbody>
        {data.map(a => {
          return (
            <tr key={a.id}>
              <td onClick={() => onClick && onClick(a)} className="cursor-pointer">
                <div className="flex items-center justify-center">
                  {isToggling && togglingId === a.id ? (
                    <span className="loading loading-spinner loading-xs text-zinc-500" />
                  ) : (
                    <input
                      onChange={() => {
                        setTogglingId(a.id);
                        toggleEnabled(a, () => {
                          setTogglingId(null);
                        });
                      }}
                      type="checkbox"
                      className="toggle toggle-sm hover:text-brand-orange-500"
                      checked={a.enabled}
                    />
                  )}
                </div>
              </td>
              <td onClick={() => onClick && onClick(a)} className="">
                {a.name ?? "N/A"}
              </td>
              <td onClick={() => onClick && onClick(a)} className="truncate overflow-hidden">
                {a.id}
              </td>
              <td>{a.metadata?.["fogbender-version"]}</td>
              <td>...{a.api_key_last_4}</td>
              <td>{dayjs(a.created_at * 1000).fromNow()}</td>
              <td>
                <a
                  className="fog:text-link font-semibod"
                  target="_blank"
                  rel="noopener"
                  href={manageUrl(a)}
                >
                  <BiLinkExternal size={18} />
                </a>
              </td>
              <td>
                <a
                  className="fog:text-link font-semibod"
                  target="_blank"
                  rel="noopener"
                  href={playgroundUrl(a)}
                >
                  <BiLinkExternal size={18} />
                </a>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

type Assistant = {
  id: string;
  provider: "OpenAI";
  object: "assistant";
  created_at: number;
  name: string;
  description: string | null;
  model: string;
  instructions: string | null;
  tools: Tool[];
  file_ids: string[];
  api_key_last_4: string;
  enabled?: boolean;
  mcp_appliance_url?: string;
  metadata?: Record<string, string>;
};

type Tool = {
  type: string;
  description: string;
  function: {
    name: string;
  };
};
