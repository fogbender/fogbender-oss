import classNames from "classnames";
import { ThickButton, useInputWithError, Icons } from "fogbender-client/src/shared";
import React, { forwardRef, useImperativeHandle } from "react";
import { useSelector } from "react-redux";
// import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PiCheckThin } from "react-icons/pi";
import { BiLinkExternal } from "react-icons/bi";
import { GoDotFill } from "react-icons/go";
import { useAtom, useAtomValue } from "jotai";

import { HighlightCode } from "./HighlightCode";
import { apiServer, fetchData, queryKeys } from "../client";
import { selectUserName } from "../../redux/session";
import { getClientUrl, getWidgetDemoUrl } from "../../config";

import { HeadlessForSupport } from "./HeadlessForSupport";

import { onboardingStateAtom, llmProviders, type LlmProvider } from "./OnboardingTypes";

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

export const NoVendors = ({
  onDone,
  setOnboardingSteps,
}: {
  onDone: () => void;
  setOnboardingSteps: (x: React.ReactNode) => void;
}) => {
  const onboardingState = useAtomValue(onboardingStateAtom);
  const [step, setStep] = React.useState(1);

  const onNext = () => setStep(x => x + 1);
  const onPrev = () => setStep(x => x - 1);

  React.useEffect(() => {
    setOnboardingSteps(
      <div className="mt-8 mb-4 w-full sm:w-min">
        <div className="flex justify-around w-full sm:w-min">
          <ul className="font-medium w-full steps steps-vertical sm:steps-horizontal">
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
              Embed widget
            </li>
            <li
              onClick={() => setStep(3)}
              className={classNames(
                "step w-36 whitespace-nowrap text-sm",
                step > 2 && "step-primary"
              )}
            >
              Configure LLM
            </li>
            <li
              onClick={() => setStep(4)}
              className={classNames("step w-36 whitespace-nowrap", step > 3 && "step-primary")}
            >
              <span className="text-base">🚀</span>
            </li>
          </ul>
        </div>
      </div>
    );
  }, [step]);

  const { vendorId } = onboardingState;

  return (
    <div className="h-full flex flex-col pb-32 sm:pb-0">
      {vendorId && <HeadlessForSupport vendorId={vendorId} hideFloatie={false} />}

      {vendorId && (
        <div
          onClick={() => {
            onDone();
          }}
          className="fixed right-5 top-[8.5rem] text-slate-400 hover:text-brand-red-500 cursor-pointer"
          title="Exit onboarding"
        >
          <Icons.XClose className="w-4" />
        </div>
      )}

      {(() => {
        if (step === 1) {
          return <Step1 onNext={onNext} />;
        } else if (step === 2) {
          return <Step2 onNext={onNext} onPrev={onPrev} />;
        } else if (step === 3) {
          return <Step3 onNext={onNext} onPrev={onPrev} />;
        } else if (step === 4) {
          return <Step4 onDone={onDone} />;
        }

        return null;
      })()}
    </div>
  );
};

const Step4 = ({ onDone }: { onDone: () => void }) => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);
  const { workspaceId } = onboardingState;
  const { data: knownAssistantsData } = useQuery({
    queryKey: [workspaceId, "llm_assistants"],
    queryFn: async () => {
      return await apiServer.url(`/api/workspaces/${workspaceId}/llm`).get().json<Assistant[]>();
    },
    initialData: [],
    enabled: !!workspaceId,
  });

  const knownAssistants = knownAssistantsData?.filter(a => a.enabled);
  const assistantsWithTools = knownAssistantsData?.filter(
    a => a.enabled && (a?.tools || []).filter(t => t.type === "function").length > 0
  );
  const assistantsToCheck = knownAssistantsData?.filter(
    a =>
      a.enabled &&
      ((a?.tools || []).filter(t => t.type === "function").length > 0 ||
        onboardingState.toolEnabled[assistantKey(a)])
  );

  const mutationRefs = React.useRef<(MutationHandler | null)[]>([]);

  const [toolCheckResults, setToolCheckResults] = React.useState<
    { key: string; result: "success" | "error" | "loading" }[]
  >([]);

  const triggerMutations = () => {
    setIsLoading(true);

    const checkResults: { key: string; result: "success" | "error" | "loading" }[] = [];
    assistantsToCheck.forEach(a => {
      checkResults.push({
        key: assistantKey(a),
        result: "loading",
      });
    });

    setToolCheckResults(checkResults);

    mutationRefs.current.forEach(ref => {
      if (ref) {
        if (
          onboardingState.toolEnabled[ref.key] ||
          assistantsWithTools.find(a => assistantKey(a) === ref.key)
        ) {
          console.log(`asking ${ref.key} to mutate`);
          ref.mutate();
        }
      }
    });
  };

  React.useEffect(() => {
    if (toolCheckResults.length !== 0) {
      if (toolCheckResults.every(r => r.result === "success")) {
        onDone();
      } else if (toolCheckResults.some(r => r.result === "error")) {
        setIsLoading(false);
      } else {
        // console.log("still loading");
      }
    }
  }, [onDone, toolCheckResults]);

  const handleMutationComplete = (
    key: string,
    response: { message: { error: string } } | null,
    error: Error | null
  ) => {
    if (response !== null) {
      console.log(key, response);

      setToolCheckResults(results => {
        return results.map(r => {
          if (r.key === key) {
            return { ...r, result: "success" };
          } else {
            return r;
          }
        });
      });
    }
    if (error) {
      setOnboardingState(s => {
        const toolErrors = s.toolErrors;
        toolErrors[key] = JSON.parse(error.message).error;
        return { ...s, toolErrors: { ...toolErrors } };
      });

      console.log(key, error);

      setToolCheckResults(results => {
        return results.map(r => {
          if (r.key === key) {
            return { ...r, result: "error" };
          } else {
            return r;
          }
        });
      });
    }
  };

  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <div className="fog:text-body-m mt-8 flex flex-col gap-y-4 pr-16 dark:text-white my-4 max-w-screen-md w-full">
      <h1 className="fog:text-header2">👩‍🚀</h1>
      <div>
        <span className="font-thin">Organization:</span> {onboardingState.vendorName}
      </div>
      <div>
        <span className="font-thin">Workspace:</span> {onboardingState.workspaceName}
      </div>
      {knownAssistants && (
        <div>
          <span className="font-thin">Assistants:</span>
        </div>
      )}
      {knownAssistants &&
        knownAssistants.map((assistant, index) => (
          <KnownAssistant
            key={assistant.id}
            assistant={assistant}
            onMutationComplete={handleMutationComplete}
            ref={el => (mutationRefs.current[index] = el ?? null)}
          />
        ))}
      <ThickButton
        disabled={isLoading}
        className="w-36"
        onClick={() => {
          triggerMutations();
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

interface KnownAssistantProps {
  assistant: Assistant;
  onMutationComplete: (key: string, data: any | null, error: Error | null) => void;
}

export interface MutationHandler {
  key: string;
  mutate: () => void;
}

const KnownAssistant = forwardRef<MutationHandler, KnownAssistantProps>(
  ({ assistant, onMutationComplete }, ref) => {
    const onboardingState = useAtomValue(onboardingStateAtom);
    const { workspaceId } = onboardingState;

    const key = assistantKey(assistant);

    const toolEnabled = onboardingState.toolEnabled[key] ?? false;
    const hasTools = (assistant?.tools ?? []).filter(t => t.type === "function").length > 0;
    const toolUrl = onboardingState.toolUrls[key] ?? "";

    const { mutate, isPending } = useMutation({
      mutationFn: async () => {
        if (hasTools && !toolEnabled) {
          throw new Error(
            JSON.stringify({
              error:
                "This assistant supports function calling, but we won’t know what to do with them without a function calling endpoint. Please either remove the functions, or add an endpoint.",
            })
          );
        } else {
          try {
            const assistantId = assistant.id;
            const provider = assistant.provider;
            const result = await apiServer
              .url(`/api/workspaces/${workspaceId}/llm/assistants/${assistantId}`)
              .patch({ provider, toolUrl })
              .text();

            return result;
          } catch (error) {
            const e = isObject(error) ? (error as object) : null;

            if (e && "response" in e && isObject(e.response)) {
              const response = e.response as object;

              if ("status" in response && response.status && typeof response.status === "number") {
                if (response.status >= 500) {
                  throw new Error(
                    JSON.stringify({
                      error: `POST to endpoint caused a internal server error (${response.status})`,
                    })
                  );
                } else if (response.status >= 400) {
                  throw error;
                }
              }
            }
            throw new Error(
              JSON.stringify({
                error: "Unknown error",
              })
            );
          }
        }
      },
      onSuccess: data => {
        onMutationComplete(key, data, null);
      },
      onError: error => {
        onMutationComplete(key, null, error);
      },
    });

    useImperativeHandle(ref, () => ({ key, mutate }));

    if (assistant.provider === "OpenAI") {
      return <KnownOpenAiAssistant assistant={assistant} isPending={isPending} />;
    } else {
      return null;
    }
  }
);

const KnownOpenAiAssistant = ({
  assistant,
  isPending,
}: {
  assistant: Assistant;
  isPending: boolean;
}) => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);
  const key = assistantKey(assistant);

  const [toolUrl, toolUrlField] = useInputWithError({
    title: `Tool/function endpoint URL for ${assistant.name || assistant.id}`,
    defaultValue: onboardingState.toolUrls[key] || assistant.tool_url,
    error: onboardingState.toolErrors[key],
  });

  const functions = assistant.tools.filter(t => t.type === "function");
  const hasFunctions = functions.length !== 0;

  const [toolUrlEnabled, setToolUrlEnabled] = React.useState(hasFunctions);

  React.useEffect(() => {
    setOnboardingState(s => {
      const toolErrors = s.toolErrors;
      toolErrors[key] = null;

      const toolEnabled = s.toolEnabled;
      toolEnabled[key] = toolUrlEnabled;

      return { ...s, toolEnabled: { ...toolEnabled }, toolErrors: { ...toolErrors } };
    });
  }, [toolUrlEnabled]);

  React.useEffect(() => {
    setOnboardingState(s => {
      const toolErrors = s.toolErrors;
      toolErrors[key] = null;

      const toolUrls = s.toolUrls;
      toolUrls[key] = toolUrl;

      return { ...s, toolUrls: { ...toolUrls }, toolErrors: { ...toolErrors } };
    });
  }, [toolUrl]);

  return (
    <div className="flex flex-col gap-4 p-4 bg-white dark:bg-slate-800">
      <table className="table table-fixed">
        <tbody>
          <tr>
            <td className="w-36">
              <span className="font-thin">Provider</span>
            </td>
            <td>{assistant.provider}</td>
          </tr>
          <tr>
            <td>
              <span className="font-thin">Assistant</span>
            </td>
            <td>
              <div className="flex gap-2 items-center">
                {assistant.name || assistant.id}
                <a
                  className="fog:text-link font-semibod"
                  target="_blank"
                  rel="noopener"
                  href={`https://platform.openai.com/assistants/${assistant.id}`}
                >
                  <BiLinkExternal size={16} />
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <span className="font-thin">Assistant ID</span>
            </td>
            <td>
              <div className="flex gap-2 items-center">{assistant.id}</div>
            </td>
          </tr>
          <tr>
            <td>
              <span className="min-w-max font-thin">Functions</span>
            </td>
            <td>
              <div className="flex flex-col">
                {functions.map((t, i) => (
                  <div key={i}>
                    <code>{t.function.name}</code> ({t.type})
                  </div>
                ))}
              </div>
            </td>
          </tr>
          <tr>
            <td>
              <span className="font-thin">Function call URL</span>
            </td>
            <td>
              <div className="flex flex-col gap-2">
                <label className="label cursor-pointer self-start flex items-center gap-2 p-0">
                  {isPending ? (
                    <span className="loading loading-ring loading-sm"></span>
                  ) : (
                    <input
                      checked={toolUrlEnabled}
                      type="checkbox"
                      className={classNames(
                        "checkbox checkbox-sm theme-controller",
                        onboardingState.toolErrors[key] ? "checkbox-error" : "checkbox-info"
                      )}
                      onChange={() => {
                        setToolUrlEnabled(x => !x);
                      }}
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-right label-text dark:text-slate-500 text-sm">
                      {toolUrlEnabled ? (
                        <span>Function calling is enabled and requires a working endpoint</span>
                      ) : (
                        <span>Function calling is disabled</span>
                      )}
                    </span>
                  </div>
                </label>
                {!toolUrlEnabled && onboardingState.toolErrors[key] && (
                  <div className="text-xs font-semibold text-brand-red-500">
                    {onboardingState.toolErrors[key]}
                  </div>
                )}
                {toolUrlEnabled && (
                  <>
                    {toolUrlField}
                    {hasFunctions ? (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Because your assistant supports{" "}
                        <a
                          href="https://platform.openai.com/docs/guides/function-calling"
                          className="fog:text-link"
                        >
                          function calling
                        </a>
                        , you must specify your tool endpoint above. We’ll POST the content of{" "}
                        <code>tool_calls</code> with <code>type: function</code> (if present) to
                        this endpoint and forward your response to OpenAI. To secure your endpoint,
                        we’ll include a <code>X-Fog-Signature-256</code> header with a SHA256 of
                        your{" "}
                        <Link className="fog:text-link no-underline" to="/admin/-/-/settings/embed">
                          workspace secret
                        </Link>
                        .
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        To take advantage of{" "}
                        <a
                          href="https://platform.openai.com/docs/guides/function-calling"
                          className="fog:text-link"
                        >
                          function calling
                        </a>
                        , you can specify your endpoint above. We’ll POST the content of{" "}
                        <code>tool_calls</code> with <code>type: function</code> (if present) to
                        this endpoint and forward your response to OpenAI. To secure your endpoint,
                        we’ll include a <code>X-Fog-Signature-256</code> header with a SHA256 of
                        your{" "}
                        <Link className="fog:text-link no-underline" to="/admin/-/-/settings/embed">
                          workspace secret
                        </Link>
                        .
                      </div>
                    )}
                  </>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

type FileAliceBob = "file" | "alice" | "bob";

const Step3 = ({ onNext }: { onNext: () => void; onPrev: () => void }) => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);
  const [provider, setProvider] = React.useState<LlmProvider>(onboardingState.provider ?? "OpenAI");

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
      <h1 className="fog:text-header2">Configure LLM</h1>

      <div className="flex flex-col sm:flex-row gap-12">
        <div className="min-w-max border-r-0 sm:border-r pr-0 sm:pr-4 dark:border-r-slate-700">
          <div className="space-x-4 sm:space-x-0 sm:space-y-8 cursor-pointer font-semibold flex flex-row sm:flex-col">
            {llmProviders.map(p => (
              <div key={p} onClick={() => onSelection(p)}>
                <a
                  className={classNames(
                    "fog:text-link no-underline flex items-center gap-1",
                    provider === p && "!text-brand-red-500"
                  )}
                >
                  {p}
                  {provider === p && <GoDotFill size={11} />}
                </a>
              </div>
            ))}
          </div>
        </div>

        {(() => {
          if (provider === "OpenAI") {
            return <OpenAI onNext={onNext} />;
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

type OpenAiResponse<T> = {
  data: T;
  first_id: string;
  has_more: boolean;
  last_id: string;
  object: "list";
};

type Tool = {
  type: string;
  description: string;
  function: {
    name: string;
  };
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
  tool_url?: string;
};

const OpenAI = ({ onNext }: { onNext: () => void }) => {
  const [onboardingState, setOnboardingState] = useAtom(onboardingStateAtom);
  const { apiKeys, workspaceId } = onboardingState;
  const [apiKey, apiKeyField] = useInputWithError({
    defaultValue: apiKeys["OpenAI"],
    type: "password",
    title: "Enter your OpenAI API key here",
  });

  const {
    data: assistantsData,
    error: assistantsError,
    isLoading: assistantsLoading,
    isError,
    refetch: refetchAssistants,
  } = useQuery({
    queryKey: queryKeys.assistants(workspaceId as string, "OpenAI", apiKey),
    queryFn: async () => {
      const assistants = await apiServer
        .url(`/api/workspaces/${workspaceId}/llm/OpenAI/assistants`)
        .post({ apiKey })
        .json<OpenAiResponse<Assistant[]>>();
      return assistants;
    },
    enabled: !!workspaceId && !!apiKey,
  });

  const { data: knownAssistantsData } = useQuery({
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

  React.useEffect(() => {
    if (assistantsError) {
      setSelectedAssistantId(null);
    }
  }, [assistantsError]);

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

  const saveOpenAiIntegrationMutation = useMutation({
    mutationFn: async () =>
      apiServer
        .url(`/api/workspaces/${workspaceId}/llm/assistants`)
        .post({ apiKey, assistantId: selectedAssistantId, provider: "OpenAI" })
        .text(),
    onSuccess: () => onNext(),
  });

  const knownAssistants = knownAssistantsData?.filter(a => a.enabled);
  const enabledAssistantIds = knownAssistants.map(a => a.id);
  const selectableAssistants = assistantsData?.data.filter(
    a => !enabledAssistantIds.includes(a.id)
  );

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
        (in Beta as of March 2024).
      </div>
      <div>
        Assistants API keeps track of chat room/thread history, which makes it a particularly great
        fit for building conversational UIs.
      </div>
      <div className="border-l-3 pl-3 border-slate-300 dark:border-slate-700">
        Note: you’ll be able to configure a URL for function/tool calling in the next step.
      </div>
      <div>
        We’ll need your OpenAI API key to communicate with your Assistant on your behalf. We
        recommend{" "}
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
      {assistantsLoading && (
        <div className="flex flex-col gap-4 w-52">
          <div className="skeleton h-4 w-28"></div>
          <div className="skeleton h-4 w-full"></div>
          <div className="skeleton h-4 w-full"></div>
        </div>
      )}

      {!isError && assistantsData && assistantsData.data.length === 0 && (
        <div>
          You don’t have any assistants yet!{" "}
          <a
            className="fog:text-link"
            href="https://platform.openai.com/assistants"
            target="_blank"
            rel="noopener"
          >
            Create one from your OpenAI dashboard
          </a>
          , then come back here.
        </div>
      )}

      {!isError && !assistantsError && (selectableAssistants || knownAssistants) && (
        <div className="flex flex-col gap-2">
          {selectableAssistants && (
            <>
              <span className="font-semibold">Available assistants</span>
              <AssistantsTable
                data={selectableAssistants}
                isEnabled={a => onboardingState.assistantIds["OpenAI"] === a.id}
                onClick={a => setSelectedAssistantId(a.id)}
                manageUrl={a => `https://platform.openai.com/assistants/${a.id}`}
                playgroundUrl={a =>
                  `https://platform.openai.com/playground?mode=assistant&assistant=${a.id}`
                }
              />
            </>
          )}
          {knownAssistants && (
            <>
              <span className="font-semibold mt-4">Previously configured</span>
              <AssistantsTable
                data={knownAssistants}
                isEnabled={a => a.enabled ?? false}
                isSelectable={false}
                manageUrl={a => `https://platform.openai.com/assistants/${a.id}`}
                playgroundUrl={a =>
                  `https://platform.openai.com/playground?mode=assistant&assistant=${a.id}`
                }
              />
            </>
          )}
          <div className="mt-6">
            <ThickButton
              disabled={!apiKey && !selectedAssistantId && knownAssistants.length === 0}
              className="max-w-min"
              onClick={() => {
                if (apiKey && selectedAssistantId) {
                  saveOpenAiIntegrationMutation.mutate();
                } else if (knownAssistants.length !== 0) {
                  onNext();
                }
              }}
            >
              Continue&nbsp;→
            </ThickButton>
          </div>
        </div>
      )}
    </div>
  );
};

const AssistantsTable = ({
  data,
  isSelectable = true,
  isEnabled,
  onClick,
  manageUrl,
  playgroundUrl,
}: {
  data: Assistant[];
  isSelectable?: boolean;
  isEnabled: (x: Assistant) => boolean;
  onClick?: (x: Assistant) => void;
  manageUrl: (x: Assistant) => string;
  playgroundUrl: (x: Assistant) => string;
}) => {
  return (
    <table className="table table-zebra table-xs">
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>ID</th>
          <th>API key</th>
          <th>Manage</th>
          <th>Playground</th>
        </tr>
      </thead>
      <tbody>
        {data.map(a => (
          <tr key={a.id}>
            <td onClick={() => onClick && onClick(a)} className="cursor-pointer">
              <input
                checked={isEnabled(a)}
                disabled={isSelectable === false}
                onChange={() => {}}
                type="radio"
                className="radio radio-primary radio-xs"
              />
            </td>
            <td onClick={() => onClick && onClick(a)} className="cursor-pointer">
              {a.name ?? "N/A"}
            </td>
            <td onClick={() => onClick && onClick(a)} className="truncate overflow-hidden">
              {a.id}
            </td>
            <td>...{a.api_key_last_4}</td>
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
        ))}
      </tbody>
    </table>
  );
};

const Step2 = ({ onNext }: { onNext: () => void; onPrev: () => void }) => {
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

  // const ourHost = window.location.protocol + "//" + window.location.host;
  // const settingsUrl = `${ourHost}/admin/-/-/settings/embed`;

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
            widgetId: "dzAwNTQ3MTk5MzE5NDg5Mzg0NDQ4",
            widgetKey: "0c0a5a5d59440bc5923",
            customerId: "C256434",
            customerName: "Hogwarts",
            userId: "U234328",
            userEmail: "hpotter@example.com",
            userName: "Harry Potter", // Don’t know the name? Reuse email here
            userAvatarUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Garfield" // optional
        };

        fogbender.setClientUrl("http://localhost:3300")
        fogbender.setToken(token);
        fogbender.setMode("light");

        const rootEl = document.getElementById("chat-widget");
        fogbender.renderIframe({ rootEl });
    </script>
  </body>
</html>`;

  const [continueLevel, setContinueLevel] = React.useState<Set<FileAliceBob>>(new Set([]));
  const [nudge, setNextNudge] = React.useState<FileAliceBob>();

  return (
    <div className="fog:text-body-m mt-8 flex flex-col gap-y-4 pr-16 dark:text-white my-4 w-full">
      <h1 className="fog:text-header2">Install chat widget</h1>
      <div className="flex-col md:flex-row flex w-full gap-8">
        <HighlightCode className="max-w-screen-md rounded language-html text-xs">
          {htmlText}
        </HighlightCode>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="font-bold">Try it</div>
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
                  onClick={() => setContinueLevel(s => new Set(s.add("file")))}
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
            <p>
              The chat widget will adapt to the alotted space. By specifying the same{" "}
              <code>customerId</code>/<code>customerName</code> for several users, you can make the
              widget multiplayer. Click on the two links below for a demo:
            </p>
            <div
              className={classNames(
                "flex items-center gap-2",
                nudge === "alice" && !continueLevel.has("alice") && "font-bold"
              )}
              onClick={() => setContinueLevel(s => new Set(s.add("alice")))}
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
              onClick={() => setContinueLevel(s => new Set(s.add("bob")))}
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
          </div>
          <div className="flex flex-col gap-4 max-w-screen-sm">
            <div className="font-bold">Important</div>
            <ul className="ml-4 list-disc space-y-4">
              <li>
                The example on the left uses the Script Tag loader. To learn about other
                installation methods and widget types, see{" "}
                <a
                  className="fog:text-link"
                  href="https://fogbender.com/docs"
                  target="_blank"
                  rel="noopener"
                >
                  Fogbender Docs
                </a>
                .
              </li>
              {/*<li>
                Using the snippet on the left in production <b>isn’t secure</b>&mdash;make sure to
                secure your token by following the instructions in Step 2 on{" "}
                <a className="fog:text-link" href={settingsUrl}>
                  Embedding Instructions
                </a>
                .
              </li>*/}
            </ul>
          </div>
          <div className="flex items-center gap-5">
            <ThickButton
              className="min-w-max"
              onClick={() => {
                const nextNudge = (["file", "alice", "bob"] as FileAliceBob[]).find(
                  e => !continueLevel.has(e)
                );

                if (!nextNudge) {
                  onNext();
                } else {
                  setNextNudge(nextNudge);
                }
              }}
            >
              Continue →
            </ThickButton>
            {nudge === "file" && !continueLevel.has("file") && (
              <div>
                Woops! You forgot to download the file <span className="text-2xl">😉</span>
              </div>
            )}
            {nudge === "alice" && !continueLevel.has("alice") && (
              <div>
                Oh no! Do make sure to check out the widget as Alice{" "}
                <span className="ml-1 text-2xl">🧐</span>
              </div>
            )}
            {nudge === "bob" && !continueLevel.has("bob") && (
              <div>
                Almost there! Please please open Bob’s widget and say hi to Alice
                <span className="ml-1 text-2xl">😻</span>
              </div>
            )}
          </div>
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
  const { data: workspaces } = useQuery<{ id: string; name: string }[]>({
    queryKey: queryKeys.workspaces(onboardingState.vendorId),
    queryFn: async () =>
      fetchData<{ id: string; name: string }[]>(
        `api/vendors/${onboardingState.vendorId}/workspaces`
      ),
    initialData: [],
    enabled: !!onboardingState.vendorId && onboardingState.workspaceId === undefined,
  });

  React.useEffect(() => {
    if (!onboardingState.workspaceId && workspaces.length !== 0) {
      const workspace = workspaces[0];
      setOnboardingState(s => ({ ...s, workspaceId: workspace.id, workspaceName: workspace.name }));
    }
  }, [onboardingState, workspaces]);

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
    onSuccess: res => {
      if (res.id) {
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
      <h1
        className={classNames(
          "fog:text-header2 opacity-0",
          userName.length > 0 && "opacity-100 transition-opacity duration-400"
        )}
      >
        {userName.split(/\s+/)[0]}—hello!
      </h1>
      <p className="font-semibold">
        Fogbender is a new way to embed a messaging experience on your site and hook it up to your
        LLM in two shakes of a <span className="text-2xl leading-none">🐑</span>’s tail.
      </p>
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
          <ThickButton className="w-full min-w-max" onClick={onSubmit} loading={formLoading}>
            Continue →
          </ThickButton>
        </p>
        <label className="label cursor-pointer self-end flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-right label-text dark:text-slate-500 text-sm">
              Enable support mode
            </span>
            <span className="dark:text-slate-500 text-xs">
              (You’ll be able to join your user’s chats. You can change this later.)
            </span>
          </div>
          <input type="checkbox" className="checkbox checkbox-info checkbox-sm theme-controller" />
        </label>
      </form>
    </div>
  );
};

const assistantKey = (assistant: Assistant) =>
  JSON.stringify({
    id: assistant.id,
    provider: assistant.provider,
  });
