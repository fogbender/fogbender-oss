import {
  formatTs,
  IntegrationDetails,
  KnownIssueTrackerIntegrations,
  Modal,
  ThinButton,
  type Integration,
} from "fogbender-client/src/shared";
import { Select } from "fogbender-client/src/shared/ui/Select";
import React from "react";
import { useLocation } from "react-router-dom";

import { type Workspace } from "../../redux/adminApi";
import { queryClient, queryKeys } from "../client";
import { useWorkspaceIntegrationsQuery } from "../useWorkspaceIntegrations";

import { ExpandableSection } from "./ExpandableSection";
import { AddAsanaIntegration, ShowAsanaIntegration } from "./Integrations/Asana";
import { AddGitHubIntegration, ShowGitHubIntegration } from "./Integrations/GitHub";
import { AddGitLabIntegration, ShowGitLabIntegration } from "./Integrations/GitLab";
import { AddHeightIntegration, ShowHeightIntegration } from "./Integrations/Height";
import { AddJiraIntegration, ShowJiraIntegration } from "./Integrations/Jira";
import { AddLinearIntegration, ShowLinearIntegration } from "./Integrations/Linear";
import { AddTrelloIntegration, ShowTrelloIntegration } from "./Integrations/Trello";

type IntegrationType = keyof typeof IntegrationDetails;

export function getIntegrationDetails(integration: Integration | IntegrationType) {
  const type = typeof integration === "string" ? integration : integration.type;
  const details = IntegrationDetails[type as IntegrationType];
  return details ? details : undefined;
}

const integrationOptions = Object.entries(IntegrationDetails).map(([k, x]) => ({
  id: k as IntegrationType,
  name: x.name,
  option: (
    <span className="flex items-center gap-1.5">
      <span className="flex-shrink-0 w-5">{x.icon}</span>
      <span>{x.name}</span>
    </span>
  ),
}));

export const Integrations: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
  const { data: integrations } = useWorkspaceIntegrationsQuery(workspace.id);

  const [selectedIntegration, setSelectedIntegration] =
    React.useState<(typeof integrationOptions)[number]>();
  const createIntegration = selectedIntegration?.id;

  const [integrationToShow, setIntegrationToShow] = React.useState<Integration | undefined>(
    undefined
  );

  {
    // handle ?add_integration=x
    const once = React.useRef(false);
    if (!once.current) {
      const params = new URLSearchParams(window.location.search);

      const integrationName =
        params.get("add_integration") || (params.has("add_integration") ? "jira" : undefined);

      if (integrationName) {
        const valid = integrationOptions.find(x => x.id === integrationName);
        if (valid) {
          setSelectedIntegration(valid);
        }
      }
    }
    once.current = true;
  }

  const [closing, setClosing] = React.useState(false);

  const onDone = React.useCallback(() => {
    setClosing(false);
    setSelectedIntegration(undefined);
    queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
    queryClient.invalidateQueries(queryKeys.tags(workspace.id));
  }, [workspace.id]);

  const title = "Issue tracker integrations";
  const { hash } = useLocation();
  const anchor = title.toLowerCase().replace(/\s+/g, "-");
  const url = `/admin/-/-/settings/integrations#${anchor}`;

  return (
    <ExpandableSection
      anchor={anchor}
      title={title}
      hash={hash}
      url={url}
      expand={(integrations || []).length !== 0}
    >
      {!!integrations?.length && (
        <table className="w-full mt-4 pb-2 border-b border-gray-200">
          <tbody>
            {integrations
              .filter(i => KnownIssueTrackerIntegrations.includes(i.type))
              .map(i => (
                <tr
                  key={i.id}
                  className="hover:bg-gray-100 dark:hover:bg-black cursor-pointer"
                  onClick={() => {
                    setIntegrationToShow(i);
                  }}
                >
                  <td className="flex gap-x-4 p-2">
                    <div className="flex-shrink-0 w-6">{getIntegrationDetails(i)?.icon}</div>
                    <div>
                      <div className="fog:text-caption-l">{getIntegrationDetails(i)?.name}</div>
                      <div className="text-gray-500 fog:text-body-xs w-36">
                        Added at {formatTs(new Date(i.inserted_at).getTime() * 1000)}
                      </div>
                    </div>
                  </td>
                  <td className="w-96 flex-1">
                    <a
                      onClick={e => e.stopPropagation()}
                      className="fog:text-link"
                      title={i.project_url}
                      href={i.project_url}
                      target="_blank"
                      rel="noopener"
                    >
                      {i.project_name}
                    </a>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      <div className="mt-4">
        <ThinButton onClick={() => setSelectedIntegration(integrationOptions[0])}>
          Add integration
        </ThinButton>
      </div>

      {integrationToShow && (
        <Modal
          skipOverlayClick={true}
          onClose={() => {
            setIntegrationToShow(undefined);
          }}
        >
          <div>
            <div className="mb-8 fog:text-header3 flex items-center gap-3">
              <span className="w-8">{getIntegrationDetails(integrationToShow)?.icon}</span>
              <span>{integrationToShow.project_name}</span>
            </div>

            {integrationToShow.type === "gitlab" && (
              <ShowGitLabIntegration
                i={integrationToShow}
                onDeleted={() => {
                  queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
                  setIntegrationToShow(undefined);
                }}
              />
            )}
            {integrationToShow.type === "linear" && (
              <ShowLinearIntegration
                i={integrationToShow}
                onDeleted={() => {
                  queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
                  setIntegrationToShow(undefined);
                }}
              />
            )}
            {integrationToShow.type === "github" && (
              <ShowGitHubIntegration
                i={integrationToShow}
                onDeleted={() => {
                  queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
                  setIntegrationToShow(undefined);
                }}
              />
            )}
            {integrationToShow.type === "asana" && (
              <ShowAsanaIntegration
                i={integrationToShow}
                onDeleted={() => {
                  queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
                  setIntegrationToShow(undefined);
                }}
              />
            )}
            {integrationToShow.type === "jira" && (
              <ShowJiraIntegration
                i={integrationToShow}
                onDeleted={() => {
                  queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
                  setIntegrationToShow(undefined);
                }}
              />
            )}
            {integrationToShow.type === "height" && (
              <ShowHeightIntegration
                i={integrationToShow}
                onDeleted={() => {
                  queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
                  setIntegrationToShow(undefined);
                }}
              />
            )}
            {integrationToShow.type === "trello" && (
              <ShowTrelloIntegration
                i={integrationToShow}
                onDeleted={() => {
                  queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
                  setIntegrationToShow(undefined);
                }}
              />
            )}
          </div>
        </Modal>
      )}

      {createIntegration && (
        <Modal
          skipOverlayClick={true}
          onClose={() => {
            setClosing(true);
          }}
        >
          <div>
            <div className="mb-2 fog:text-header2">Add integration</div>
            <div className="my-4">
              <Select
                onChange={setSelectedIntegration}
                options={integrationOptions}
                selectedOption={selectedIntegration}
              />
            </div>
            {createIntegration === "gitlab" ? (
              <AddGitLabIntegration workspace={workspace} onDone={onDone} closing={closing} />
            ) : createIntegration === "linear" ? (
              <AddLinearIntegration workspace={workspace} onDone={onDone} closing={closing} />
            ) : createIntegration === "github" ? (
              <AddGitHubIntegration workspace={workspace} onDone={onDone} closing={closing} />
            ) : createIntegration === "asana" ? (
              <AddAsanaIntegration workspace={workspace} onDone={onDone} closing={closing} />
            ) : createIntegration === "jira" ? (
              <AddJiraIntegration workspace={workspace} onDone={onDone} closing={closing} />
            ) : createIntegration === "height" ? (
              <AddHeightIntegration workspace={workspace} onDone={onDone} closing={closing} />
            ) : createIntegration === "trello" ? (
              <AddTrelloIntegration workspace={workspace} onDone={onDone} closing={closing} />
            ) : (
              <NotImplemented
                onDone={() => {
                  setClosing(false);
                  setSelectedIntegration(undefined);
                }}
                closing={closing}
              />
            )}
          </div>
        </Modal>
      )}
    </ExpandableSection>
  );
};

const NotImplemented: React.FC<{ closing: boolean; onDone: () => void }> = ({
  closing,
  onDone,
}) => {
  React.useEffect(() => {
    if (closing === true) {
      onDone();
    }
  }, [closing, onDone]);

  return <pre className="my-4 font-medium">Not implemented :(</pre>;
};
