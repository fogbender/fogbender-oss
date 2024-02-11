import {
  formatTs,
  IconPagerDuty,
  KnownIncidentResponseIntegrations,
  Modal,
  ThinButton,
  type Integration,
} from "fogbender-client/src/shared";
import { Select } from "fogbender-client/src/shared/ui/Select";
import React from "react";

import { type Workspace } from "../../redux/adminApi";
import { queryClient, queryKeys } from "../client";
import { useWorkspaceIntegrationsQuery } from "../useWorkspaceIntegrations";

import { ExpandableSection } from "./ExpandableSection";
import { AddPagerDutyIntegration, ShowPagerDutyIntegration } from "./Integrations/PagerDuty";

const IntegrationDetails = {
  "pagerduty": { type: "pagerduty", name: "PagerDuty", icon: <IconPagerDuty className="w-full" /> },
};

type IntegrationType = keyof typeof IntegrationDetails;

function getIntegrationDetails(integration: Integration | IntegrationType) {
  const type = typeof integration === "string" ? integration : integration.type;
  const details = IntegrationDetails[type as IntegrationType];
  return details ? details : undefined;
}

const integrationOptions = Object.values(IntegrationDetails).map(x => ({
  id: x.type,
  type: x.type,
  name: x.name,
  option: (
    <div className="flex gap-2 items-center">
      <div className="flex-shrink-0 w-4">{x.icon}</div>
      <span>{x.name}</span>
    </div>
  ),
}));

export const IncidentResponseIntegrations: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
  const integrationsData = useWorkspaceIntegrationsQuery(workspace.id);
  const { data: integrations } = integrationsData;

  const incidentResponseIntegrations = (integrations || []).filter(i =>
    KnownIncidentResponseIntegrations.includes(i.type)
  );

  const [selectedIntegration, setSelectedIntegration] =
    React.useState<(typeof integrationOptions)[number]>();
  const createIntegration = selectedIntegration?.id;

  const [integrationToShow, setIntegrationToShow] = React.useState<Integration | undefined>(
    undefined
  );

  React.useEffect(() => {
    if (integrationToShow) {
      const x = integrations?.find(i => i.id === integrationToShow.id);

      if (x) {
        setIntegrationToShow(x);
      }
    }
  }, [integrations, integrationToShow]);

  {
    // handle ?add_incident_response_integration=x
    const once = React.useRef(false);
    if (!once.current) {
      const integrationName = new URLSearchParams(window.location.search).get(
        "add_incident_response_integration"
      ) as IntegrationType | undefined;
      const valid = integrationOptions.find(x => x.id === integrationName);
      if (valid) {
        setSelectedIntegration(valid);
      }
    }
    once.current = true;
  }

  const [closing, setClosing] = React.useState(false);

  const possibleOptions = integrationOptions.filter(
    d => incidentResponseIntegrations.find(i => i.type === d.type) === undefined
  );

  return (
    <ExpandableSection
      title="Incident response integrations"
      expand={incidentResponseIntegrations.length !== 0}
    >
      {incidentResponseIntegrations.length !== 0 && (
        <table className="w-full mt-4 pb-2 border-b border-gray-200">
          <tbody>
            {incidentResponseIntegrations.map(i => (
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

      {possibleOptions.length !== 0 && (
        <div className="mt-4">
          <ThinButton onClick={() => setSelectedIntegration(possibleOptions[0])}>
            Add integration
          </ThinButton>
        </div>
      )}

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
              <span>{integrationToShow.project_name ?? integrationToShow.project_id}</span>
            </div>

            {integrationToShow.type === "pagerduty" && (
              <ShowPagerDutyIntegration
                i={integrationToShow}
                onUpdated={() => {
                  integrationsData.refetch();
                }}
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
            <div className="mb-2 fog:text-header2">Add Integration</div>
            <div className="my-4">
              <Select
                onChange={setSelectedIntegration}
                options={possibleOptions}
                selectedOption={selectedIntegration}
              />
            </div>
            {createIntegration === "pagerduty" ? (
              <AddPagerDutyIntegration
                workspace={workspace}
                onDone={() => {
                  setClosing(false);
                  queryClient.invalidateQueries(queryKeys.integrations(workspace.id));
                  setSelectedIntegration(undefined);
                }}
                closing={closing}
              />
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
