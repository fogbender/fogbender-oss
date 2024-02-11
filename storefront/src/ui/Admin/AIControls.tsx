import classNames from "classnames";
import {
  Icons,
  LinkButton,
  ThickButton,
  ThinButton,
  type Prompt as PromptT,
  useInput,
  useInputWithError,
} from "fogbender-client/src/shared";
import { showAiHelperAtom } from "fogbender-client/src/shared/store/config.store";
import { ChevronButton } from "fogbender-client/src/shared/ui/ChevronButton";
import { useAtomValue } from "jotai";
import React from "react";
import { useMutation, useQuery } from "react-query";
import TextareaAutosize from "react-textarea-autosize";
import { throttle } from "throttle-debounce";

import { getServerUrl } from "../../config";
import { type Workspace } from "../../redux/adminApi";
import { apiServer, queryClient, queryKeys } from "../client";
import { useDedicatedVendorId, useVendorById } from "../useVendor";
import { useVerifiedDomains } from "../useVerifiedDomains";
import { useWorkspaceIntegrationsQuery } from "../useWorkspaceIntegrations";

const InputClassName =
  "w-full bg-white dark:bg-gray-600 text-gray-800 transition rounded focus:outline-none border border-blue-500 px-3 appearance-none leading-loose";

export const AIControls: React.FC<{
  workspace: Workspace;
}> = ({ workspace }) => {
  const { data: integrations } = useWorkspaceIntegrationsQuery(workspace.id);

  const aiIntegration = integrations?.find(i => ["ai"].includes(i.type));

  const mutation = useAiMutation();

  const vendorName = useVendorById(useDedicatedVendorId())?.name;

  const [botName, botNameInput] = useInput({
    type: "text",
    className: InputClassName,
    outerDivClassName: "w-52 border",
    placeholder: `${vendorName} Sidekick`,
    defaultValue: `${vendorName} Sidekick`,
    onEnter: () => {
      if (botName) {
        mutation.mutate({ workspaceId: workspace.id, botName, operation: "enable" });
      }
    },
  });

  const showAiHelper = useAtomValue(showAiHelperAtom);

  return (
    <div className="flex-1 py-2 px-4 rounded-lg fog:box-shadow-m bg-white dark:text-white dark:bg-brand-dark-bg">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <div>1. Give your bot a name: </div>
          {botNameInput}
        </div>

        <div className="flex gap-2 items-center">
          <div>2.</div>

          <img
            src="https://fog-bot-avatars.s3.amazonaws.com/ai_192.png"
            title={botName}
            className="w-7 h-7 -translate-y-0.5 "
            alt="bot avatar"
          />

          {aiIntegration ? (
            <div className="flex gap-2 items-center">
              <div className="flex gap-2 items-center">
                <Icons.RadioFull /> <span>enable</span>
              </div>
              <div
                className="flex gap-2 items-center cursor-pointer"
                onClick={() => {
                  if (
                    window.confirm("Are you sure? You will lose the bot instructions.") === true
                  ) {
                    mutation.mutate({ workspaceId: workspace.id, botName, operation: "disable" });
                  }
                }}
              >
                <Icons.RadioEmpty /> <span>disable</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <div
                className="flex gap-2 items-center cursor-pointer"
                onClick={() =>
                  mutation.mutate({ workspaceId: workspace.id, botName, operation: "enable" })
                }
              >
                <Icons.RadioEmpty /> <span>enable</span>
              </div>
              <div className="flex gap-2 items-center">
                <Icons.RadioFull /> <span>disable</span>
              </div>
            </div>
          )}

          <div>the bot</div>
        </div>

        {showAiHelper && (
          <div className="flex flex-col gap-4">
            <div>
              3. Add URLs for publicly-accessible content (docs, FAQs, blog posts, etc) you want
              your bot to know about
            </div>

            <Embeddings workspace={workspace} />
          </div>
        )}

        <div>
          {showAiHelper ? 4 : 3}. Build prompts below. For instructions, see{" "}
          <a
            className="fog:text-link"
            target="_blank"
            rel="noopener"
            href="https://fogbender.com/blog/generating-bot-prompt-instructions-with-chatgpt"
          >
            "Generating bot prompt instructions with ChatGPT"
          </a>
          .
        </div>
        <ThinButton
          className="max-w-min"
          onClick={() =>
            mutation.mutate({
              workspaceId: workspace.id,
              operation: "new-prompt",
            })
          }
        >
          New prompt
        </ThinButton>
        {aiIntegration?.prompts?.map(p => (
          <div
            key={p.id}
            className="w-full bg-white dark:bg-black p-4 rounded-xl flex flex-col gap-4"
          >
            <Prompt workspace={workspace} prompt={p} />
          </div>
        ))}
      </div>
    </div>
  );
};

const Prompt: React.FC<{
  workspace: Workspace;
  prompt: PromptT;
}> = params => {
  const {
    workspace,
    prompt: { id, command, instruction },
  } = params;
  const mutation = useAiMutation();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const [commandValue, commandInput] = useInput({
    type: "text",
    className: InputClassName,
    outerDivClassName: "w-48 border",
    defaultValue: command,
    placeholder: "request issue info",
    onBlur: () => setPrompt(),
  });

  const setPrompt = () =>
    mutation.mutate({
      workspaceId: workspace.id,
      operation: "set-prompt",
      id,
      command: commandValue,
      instruction: textareaRef.current?.value,
    });

  const throttled = React.useMemo(
    () => throttle(5000, (cb: (v: AiMutationParams) => void, v: AiMutationParams) => cb(v)),
    []
  );

  const isJson = (str: string) => {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };

  const onChange = React.useCallback(() => {
    setInstructionValue(textareaRef.current?.value || "");

    return throttled(mutation.mutate, {
      workspaceId: workspace.id,
      operation: "set-prompt",
      id,
      command: commandValue,
      instruction: textareaRef.current?.value,
    });
  }, [throttled, commandValue, id, mutation, workspace]);

  const [focused, setFocused] = React.useState<boolean>();

  const [instructionValue, setInstructionValue] = React.useState(instruction);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">ID: {id}</div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">Command: {commandInput}</div>
        {textareaRef.current?.value && isJson(textareaRef.current?.value) && (
          <LinkButton
            className="!p-0"
            onClick={() => {
              if (textareaRef.current?.value) {
                const obj = JSON.parse(textareaRef.current?.value);
                const pretty = JSON.stringify(obj, null, 2);
                setInstructionValue(pretty);
                setPrompt();
              }
            }}
          >
            Prettify JSON
          </LinkButton>
        )}
      </div>
      <div className="">Instructions:</div>
      <TextareaAutosize
        ref={textareaRef}
        onChange={onChange}
        maxRows={20}
        className={classNames(
          "fbr-scrollbar resize-none w-full py-1.5 px-2.5 rounded text-black placeholder:text-gray-500 fbr-placeholder-truncate text-base sm:text-sm focus:outline-none border border-blue-500",
          focused ? "bg-blue-50" : "bg-gray-100",
          "dark:bg-brand-dark-bg dark:text-white"
        )}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={() => {
          setPrompt();
          setFocused(false);
        }}
        value={instructionValue}
      />
      <div className="flex justify-end">
        <ThinButton
          className="max-w-min"
          onClick={() => {
            if (window.confirm("Are you sure?") === true) {
              mutation.mutate({ workspaceId: workspace.id, id, operation: "delete-prompt" });
            }
          }}
        >
          Delete
        </ThinButton>
      </div>
    </div>
  );
};

type EmbeddingsSource = {
  id: string;
  url: string;
  description: string;
  parent_id: string;
  status: "ready" | "fetching" | "candidate" | "404" | "400";
  ready: number;
  fetching: number;
  error: number;
  children?: EmbeddingsSource[];
};

const Embeddings: React.FC<{
  workspace: Workspace;
}> = params => {
  const { workspace } = params;

  const mutation = useAiMutation();

  const [urlError, setUrlError] = React.useState<string>();

  const embeddingsSources = useQuery<EmbeddingsSource[]>(
    queryKeys.embeddingsSources(workspace.id),
    () =>
      apiServer
        .get(`/api/workspaces/${workspace.id}/integrations/ai/embeddings_sources`)
        .json<EmbeddingsSource[]>(),
    {
      initialData: [],
      refetchInterval: sources => {
        if ((sources || []).some(s => s.status === "fetching" || s.fetching > 0)) {
          return 5000;
        } else {
          return false;
        }
      },
    }
  );

  const { data: embeddingsSourcesData } = embeddingsSources;

  const vendorId = useVendorById(useDedicatedVendorId())?.id;

  const { data: verifiedDomainsData } = useVerifiedDomains(vendorId);

  const placeholder = `https://docs.${
    ((verifiedDomainsData && verifiedDomainsData.length > 0 && verifiedDomainsData[0]) || undefined)
      ?.domain || "example.com"
  }`;

  const [restrictPath, setRestrictPath] = React.useState(false);

  const setUrl = (url: string, restrictPath: boolean) => {
    mutation.mutate({
      workspaceId: workspace.id,
      operation: "new-embeddings-source",
      url,
      restrictPath,
      onSuccess: () => {
        resetUrl();
      },
      onError: async err => {
        const { error } = await err.json();
        setUrlError(error);
      },
    });
  };

  const [url, urlInput, resetUrl] = useInputWithError({
    className: "border-0",
    title: "Content URL",
    placeholder,
    error: urlError,
    onEnter: () => {
      if (url) {
        setUrl(url, restrictPath);
      }
    },
  });

  React.useEffect(() => {
    setUrlError(undefined);
  }, [url]);

  const [deletingId, setDeletingId] = React.useState<string>();

  const [expandSection, setExpandSection] = React.useState<{
    [id: string]: "expanded" | "collapsed";
  }>({});

  const [expandChildren, setExpandChildren] = React.useState<{
    [id: string]: "expanded" | "collapsed";
  }>({});

  const renderEmbeddingsSources = (
    sources: EmbeddingsSource[],
    level: number,
    sectionId: string
  ) => {
    return sources.map((s, i) => {
      const expanded =
        expandChildren[s.id] === "expanded" ||
        (expandSection[sectionId] === "expanded" && expandChildren[s.id] !== "collapsed");

      const percentageReady = Math.round((s.ready / (s.ready + s.fetching + s.error)) * 100);

      return (
        <div
          key={`${s}-${i}`}
          className={classNames(level === 0 && "border border-gray-200 rounded-xl p-3")}
        >
          <div className="flex justify-between group hover:bg-gray-100">
            <div className="flex gap-2 items-center">
              <div className="max-w-fit">
                <a
                  className="no-underline group-hover:text-red-500"
                  href={s.url}
                  target="_blank"
                  rel="noopener"
                >
                  {s.url}
                </a>
              </div>
              {(s.status === null || s.status === "fetching" || deletingId === s.id) && (
                <Icons.Spinner className="w-3 h-3" />
              )}
              {s.children?.length && (
                <span
                  className="cursor-pointer flex items-center gap-2"
                  onClick={() =>
                    setExpandChildren(ids => {
                      if (ids[s.id]) {
                        ids[s.id] = ids[s.id] === "expanded" ? "collapsed" : "expanded";
                      } else {
                        ids[s.id] =
                          expandSection[sectionId] === "expanded" ? "collapsed" : "expanded";
                      }

                      return { ...ids };
                    })
                  }
                >
                  {level !== 0 && (
                    <span className="flex items-center gap-2">
                      <span>({s.children.length})</span>
                      <ChevronButton isOpen={expanded} />
                    </span>
                  )}
                  {level === 0 && (
                    <span
                      className="uppercase font-medium hover:text-red-500 text-sm leading-normal bg-gray-200 px-1 rounded self-center"
                      onClick={() => {
                        setExpandSection(ids => {
                          if (ids[s.id]) {
                            ids[s.id] = ids[s.id] === "expanded" ? "collapsed" : "expanded";
                          } else {
                            ids[s.id] = expandSection[sectionId] ? "collapsed" : "expanded";
                          }

                          return { ...ids };
                        });
                      }}
                    >
                      {expanded ? <span>collapse</span> : <span>expand</span>}
                    </span>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-6 items-center">
              {!isNaN(percentageReady) && (
                <span className="font-medium text-sm">{percentageReady}%</span>
              )}
              {s.status === "ready" && (
                <span className="w-12 text-right">
                  <span className="bg-green-600 text-white font-medium py-0 px-1.5 rounded text-sm">
                    active
                  </span>
                </span>
              )}
              {s.status === "fetching" && (
                <span className="w-12 text-right">
                  <span className="bg-gray-300 text-white font-medium py-0 px-1.5 rounded text-sm">
                    fetching
                  </span>
                </span>
              )}
              {s.status === "404" && (
                <span className="w-12 text-right">
                  <span className="bg-red-500 text-white font-medium py-0 px-1.5 rounded text-sm">
                    404
                  </span>
                </span>
              )}
              {s.status === "400" && (
                <span className="w-12 text-right">
                  <span className="bg-yellow-500 text-white font-medium py-0 px-1.5 rounded text-sm">
                    400
                  </span>
                </span>
              )}
              {s.status === "candidate" && (
                <LinkButton
                  className="!p-0"
                  onClick={() => {
                    mutation.mutate({
                      workspaceId: workspace.id,
                      id: s.id,
                      operation: "activate-embeddings-source",
                    });
                  }}
                >
                  activate
                </LinkButton>
              )}
              <div
                onClick={() => {
                  setDeletingId(s.id);
                  mutation.mutate({
                    workspaceId: workspace.id,
                    id: s.id,
                    operation: "delete-embeddings-source",
                    onSuccess: () => {
                      setDeletingId(undefined);
                    },
                  });
                }}
                className="text-gray-500 hover:text-red-500 cursor-pointer"
              >
                <Icons.Trash />
              </div>
            </div>
          </div>
          {s.children && (
            <div>
              {expanded && (
                <div className="">
                  {renderEmbeddingsSources(s.children, level + 1, level === 0 ? s.id : sectionId)}
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const restrictPathOnChange = () => setRestrictPath(x => !x);

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-3/4">{urlInput}</div>
        <span className="flex gap-1">
          <input type="checkbox" checked={restrictPath} onChange={restrictPathOnChange} />
          <span>Restrict path</span>
        </span>
        <ThickButton
          className={classNames(
            "h-14",
            "transition-opacity duration-100 ease-in",
            url ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={() => {
            if (url) {
              setUrl(url, restrictPath);
            }
          }}
        >
          Add
        </ThickButton>
      </div>

      <div
        className={classNames(
          "w-full bg-white p-4 rounded-xl flex flex-col gap-4",
          (!embeddingsSourcesData || embeddingsSourcesData.length === 0) && "hidden"
        )}
      >
        {renderEmbeddingsSources(embeddingsSourcesData || [], 0, "root")}
      </div>
    </>
  );
};

type AiMutationParams = {
  workspaceId: string;
  id?: string;
  botName?: string;
  command?: string;
  instruction?: string;
  url?: string;
  operation:
    | "enable"
    | "disable"
    | "new-prompt"
    | "set-prompt"
    | "delete-prompt"
    | "new-embeddings-source"
    | "delete-embeddings-source"
    | "activate-embeddings-source";
  restrictPath?: boolean;
  onError?: (e: Response) => void;
  onSuccess?: (r: Response) => void;
};

const useAiMutation = () => {
  return useMutation(
    (params: AiMutationParams) => {
      const { workspaceId, botName, id, command, instruction, operation, url, restrictPath } =
        params;

      const bodyParams: {
        id?: string;
        instructions?: string;
        botName?: string;
        command?: string;
        instruction?: string;
        url?: string;
        restrictPath?: boolean;
      } = {};

      if (operation === "enable") {
        bodyParams.botName = botName;
      } else if (operation === "set-prompt") {
        bodyParams.id = id;
        bodyParams.command = command;
        bodyParams.instruction = instruction;
      } else if (operation === "delete-prompt") {
        bodyParams.id = id;
      } else if (operation === "new-embeddings-source") {
        bodyParams.url = url;
        if (restrictPath) {
          bodyParams.restrictPath = true;
        }
      } else if (["delete-embeddings-source", "activate-embeddings-source"].includes(operation)) {
        bodyParams.id = id;
      }

      return fetch(`${getServerUrl()}/api/workspaces/${workspaceId}/integrations/ai/${operation}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(bodyParams),
      });
    },
    {
      onSuccess: (r, opts) => {
        const { workspaceId, operation, onError, onSuccess } = opts;

        if (r.status === 400 && onError) {
          onError(r);
        }

        if (r.status === 204 && onSuccess) {
          onSuccess(r);
        }

        if (
          [
            "new-embeddings-source",
            "delete-embeddings-source",
            "activate-embeddings-source",
          ].includes(operation)
        ) {
          queryClient.invalidateQueries(queryKeys.embeddingsSources(workspaceId));
        } else if (operation !== "set-prompt") {
          queryClient.invalidateQueries(queryKeys.integrations(workspaceId));
        }
      },
    }
  );
};
