import classNames from "classnames";
import React from "react";
import { Link, Route, Routes } from "react-router-dom";

import { getServerUrl } from "../config";
import { Agent } from "../redux/adminApi";

import "./Detective.css";
import { FogviteCodes } from "./detective/FogviteCodes";
import { FBRFogvites } from "./detective/Fogvites";

export type AnyAction<T extends string, A> = A & {
  type: T;
};

export function createAction<T extends string, P, AC extends (...args: any[]) => AnyAction<T, P>>(
  type: T,
  map: AC
): AC & { type: T } {
  const actionCreator = map as AC & { type: T };
  actionCreator.type = type;
  return actionCreator;
}

export function createMapAction<T extends string, A, P>(type: T, payloadCreator: (a: A) => P) {
  return createAction(type, (a: A) => ({ type, payload: payloadCreator(a) }));
}

enum EntityType {
  Vendor = "v",
  Workspace = "w",
  Helpdesk = "h",
  Agent = "a",
  User = "u",
}

interface Vendor {
  id: string;
  name: string;
  entityType: EntityType.Vendor;
}

interface Workspace {
  id: string;
  name: string;
  entityType: EntityType.Workspace;
}

interface Helpdesk {
  id: string;
  name: string;
  entityType: EntityType.Helpdesk;
}

const actionCreators = {
  setVendor: createMapAction("SET_VENDOR", (x: Vendor) => x),
  setWorkspace: createMapAction("SET_WORKSPACE", (x: Workspace) => x),
  setHelpdesk: createMapAction("SET_HELPDESK", (x: Helpdesk) => x),
  showDetails: createMapAction("SHOW_DETAILS", (x: Details) => x),
};

type Action = ReturnType<(typeof actionCreators)[keyof typeof actionCreators]>;

interface Details {
  id: string;
  entity_type: EntityType;
  api_call: string;
}

interface DetectiveDashboardState {
  vendor_id: string | null;
  workspace_id: string | null;
  helpdesk_id: string | null;
  details: Details | null;
}

const initialState: DetectiveDashboardState = {
  vendor_id: null,
  workspace_id: null,
  helpdesk_id: null,
  details: null,
};

const reducer: React.Reducer<DetectiveDashboardState, Action> = (state, action) => {
  switch (action.type) {
    case actionCreators.setVendor.type:
      return {
        ...state,
        vendor_id: action.payload.id,
        workspace_id: null,
        helpdesk_id: null,
      };

    case actionCreators.setWorkspace.type:
      return { ...state, workspace_id: action.payload.id, helpdesk_id: null };

    case actionCreators.setHelpdesk.type:
      return { ...state, helpdesk_id: action.payload.id };

    case actionCreators.showDetails.type:
      return { ...state, details: action.payload };

    default:
      throw new Error();
  }
};

const StoreFront = () => {
  const baseUrl = getServerUrl();

  return (
    <div className="Detective">
      {/*
        if we don't do this, prod build will strip override CSS for .calendly-inline-widget
      */}
      <div className="calendly-inline-widget hidden" />
      <h2>FBR Detective</h2>

      <a target="_blank" rel="noopener" href={`${baseUrl}/detective_auth/google`}>
        Detective SIGN IN
      </a>

      <br />

      <a target="_blank" rel="noopener" href={`${baseUrl}/detective_auth/google/signout`}>
        Detective SIGN OUT
      </a>
      <br />

      <ul className="flex space-x-2">
        <li>
          <Link to="">Detective</Link>
        </li>
        <li>
          <Link to="test">Test</Link>
        </li>
        <li>
          <Link to="search/agents">Search agents</Link>
        </li>
        <li>
          <Link to="fogvite_codes">Fogvite codes</Link>
        </li>
        <li>
          <Link to="fogvites">Fogvites</Link>
        </li>
      </ul>

      <>
        <>
          <Routes>
            <Route path="" element={<DetectiveDashboard />} />
            <Route
              path="test"
              element={<iframe title="detective" src={`${baseUrl}/detective_auth/google/test`} />}
            />
            <Route path="search/agents" element={<DetectiveSearch />} />
            <Route path="fogvite_codes/*" element={<FogviteCodes />}>
              <Route path="" />
              <Route path=":codeId" />
            </Route>
            <Route path="fogvites/*" element={<FBRFogvites />}>
              <Route path="" />
              <Route path=":agentId" />
            </Route>
          </Routes>
        </>
      </>
    </div>
  );
};

const DetectiveDashboard = () => {
  const baseUrl = getServerUrl();
  const [loading, error, data] = useFetch<{ id: string; name: string }[]>(
    `${baseUrl}/detective_api/vendors`
  );

  const [state, dispatch] = React.useReducer<React.Reducer<DetectiveDashboardState, Action>>(
    reducer,
    initialState
  );

  const { vendor_id, workspace_id, helpdesk_id, details } = state;

  return (
    <>
      {loading && "loading"}
      {error && "error " + error}
      {data && (
        <>
          <div className="detective-ui-container">
            <div className="detective-ui-section">
              <span>VENDORS</span>
              <ul>
                {data.map(vendor => (
                  <li key={vendor.id}>
                    <button
                      className={classNames(vendor_id === vendor.id && "detective-ui-selected")}
                      onClick={() => {
                        dispatch(
                          actionCreators.setVendor({ ...vendor, entityType: EntityType.Vendor })
                        );
                      }}
                    >
                      {vendor.name}
                    </button>
                    <DetailsButton
                      state={state}
                      details={{
                        id: vendor.id,
                        entity_type: EntityType.Vendor,
                        api_call: `vendors/${vendor.id}`,
                      }}
                      dispatch={dispatch}
                    />
                  </li>
                ))}
              </ul>
            </div>
            {vendor_id && (
              <>
                <VendorAgentsPane state={state} dispatch={dispatch} />
                <VendorWorkspacesPane state={state} dispatch={dispatch} />

                {workspace_id && <HelpdesksPane state={state} dispatch={dispatch} />}

                {helpdesk_id && <UsersPane state={state} dispatch={dispatch} />}
              </>
            )}
          </div>
          {details && (
            <div className="detective-ui-container">
              <DetailsPane {...state} />
            </div>
          )}
        </>
      )}
    </>
  );
};

const VendorAgentsPane: React.FC<{
  state: DetectiveDashboardState;
  dispatch: React.Dispatch<Action>;
}> = ({ state, dispatch }) => {
  const baseUrl = getServerUrl();
  const { vendor_id } = state;

  const [loading, error, data] = useFetch<{ id: string; name: string }[]>(
    `${baseUrl}/detective_api/vendors/${vendor_id}/agents`
  );

  return (
    <>
      {loading && "loading"}
      {error && "error " + error}
      {data && (
        <div className="detective-ui-section">
          <span>AGENTS</span>
          <ul>
            {data.map(agent => (
              <li key={agent.id}>
                <button
                  onClick={() => {
                    return;
                  }}
                >
                  {agent.name}
                </button>
                <DetailsButton
                  state={state}
                  details={{
                    id: agent.id,
                    entity_type: EntityType.Agent,
                    api_call: `agents/${agent.id}`,
                  }}
                  dispatch={dispatch}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

const VendorWorkspacesPane: React.FC<{
  state: DetectiveDashboardState;
  dispatch: React.Dispatch<Action>;
}> = ({ state, dispatch }) => {
  const baseUrl = getServerUrl();
  const { vendor_id, workspace_id } = state;

  const [loading, error, data] = useFetch<{ id: string; name: string }[]>(
    `${baseUrl}/detective_api/vendors/${vendor_id}/workspaces`
  );

  return (
    <>
      {loading && "loading"}
      {error && "error " + error}
      {data && (
        <div className="detective-ui-section">
          <span>WORKSPACES</span>
          <ul>
            {data.map(workspace => (
              <li key={workspace.id}>
                <button
                  className={classNames(workspace_id === workspace.id && "detective-ui-selected")}
                  onClick={() => {
                    dispatch(
                      actionCreators.setWorkspace({
                        ...workspace,
                        entityType: EntityType.Workspace,
                      })
                    );
                  }}
                >
                  {workspace.name}
                </button>
                <DetailsButton
                  state={state}
                  details={{
                    id: workspace.id,
                    entity_type: EntityType.Workspace,
                    api_call: `workspaces/${workspace.id}`,
                  }}
                  dispatch={dispatch}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

const HelpdesksPane: React.FC<{
  state: DetectiveDashboardState;
  dispatch: React.Dispatch<Action>;
}> = ({ state, dispatch }) => {
  const baseUrl = getServerUrl();
  const { workspace_id, helpdesk_id } = state;

  const [loading, error, data] = useFetch<
    {
      id: string;
      name: string;
    }[]
  >(`${baseUrl}/detective_api/workspaces/${workspace_id}/helpdesks`);

  return (
    <>
      {loading && "loading"}
      {error && "error " + error}
      {data && (
        <div className="detective-ui-section">
          <span>HELPDESKS</span>
          <ul>
            {data.map(helpdesk => (
              <li key={helpdesk.id}>
                <button
                  className={classNames(helpdesk_id === helpdesk.id && "detective-ui-selected")}
                  onClick={() => {
                    dispatch(
                      actionCreators.setHelpdesk({ ...helpdesk, entityType: EntityType.Helpdesk })
                    );
                  }}
                >
                  {helpdesk.name}
                </button>
                <DetailsButton
                  state={state}
                  details={{
                    id: helpdesk.id,
                    entity_type: EntityType.Helpdesk,
                    api_call: `helpdesks/${helpdesk.id}`,
                  }}
                  dispatch={dispatch}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

const UsersPane: React.FC<{
  state: DetectiveDashboardState;
  dispatch: React.Dispatch<Action>;
}> = ({ state, dispatch }) => {
  const baseUrl = getServerUrl();
  const { helpdesk_id } = state;

  const [loading, error, data] = useFetch<{ id: string; name: string }[]>(
    `${baseUrl}/detective_api/helpdesks/${helpdesk_id}/users`
  );

  return (
    <>
      {loading && "loading"}
      {error && "error " + error}
      {data && (
        <div className="detective-ui-section">
          <span>USERS</span>
          <ul>
            {data.map(user => (
              <li key={user.id}>
                <button
                  onClick={() => {
                    return;
                  }}
                >
                  {user.name}
                </button>
                <DetailsButton
                  state={state}
                  details={{
                    id: user.id,
                    entity_type: EntityType.User,
                    api_call: `users/${user.id}`,
                  }}
                  dispatch={dispatch}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

const DetailsPane: React.FC<DetectiveDashboardState> = state => {
  const baseUrl = getServerUrl();
  const { details } = state;
  const { entity_type, api_call } = { ...details };
  const [loading, error, data] = useFetch<any>(`${baseUrl}/detective_api/${api_call}`);

  if (data) {
    switch (entity_type) {
      case EntityType.Vendor:
        return (
          <div className="detective-ui-section">
            <span>
              VENDOR <span className="detective-ui-details-button-selected">details</span>
            </span>
            <br />
            <span>id: {data.id}</span>
            <br />
            <span>name: {data.name}</span>
          </div>
        );

      case EntityType.Agent:
        return (
          <div className="detective-ui-section">
            <span>
              AGENT <span className="detective-ui-details-button-selected">details</span>
            </span>
            <br />
            <span>id: {data.id}</span>
            <br />
            <span>name: {data.name}</span>
            <br />
            <Link to={"/detective/fogvites/" + data.id}>fogvites</Link>
          </div>
        );

      case EntityType.Workspace:
        return (
          <div className="detective-ui-section">
            <span>
              WORKSPACE <span className="detective-ui-details-button-selected">details</span>
            </span>
            <br />
            <span>id: {data.id}</span>
            <br />
            <span>name: {data.name}</span>
          </div>
        );

      case EntityType.Helpdesk: {
        const { helpdesk, customer } = data;
        return helpdesk && customer ? (
          <div className="detective-ui-section">
            <span>
              HELPDESK <span className="detective-ui-details-button-selected">details</span>
            </span>
            <br />
            <span>id: {helpdesk.id}</span>
            <br />
            <span>name: {helpdesk.name}</span>
            <br />
            <br />

            <span>CUSTOMER</span>
            <br />
            <span>id: {customer.id}</span>
            <br />
            <span>name: {customer.name}</span>
          </div>
        ) : null;
      }

      case EntityType.User:
        return (
          <div className="detective-ui-section">
            <span>
              USER <span className="detective-ui-details-button-selected">details</span>
            </span>
            <br />
            <span>id: {data.id}</span>
            <br />
            <span>name: {data.name}</span>
            <br />
            <span>email: {data.email}</span>
          </div>
        );

      default:
        return null;
    }
  } else if (error) {
    return <>"error " + error</>;
  } else if (loading) {
    return <>"LOADING..."</>;
  } else {
    return null;
  }
};

const DetailsButton: React.FC<{
  state: DetectiveDashboardState;
  details: Details;
  dispatch: React.Dispatch<Action>;
}> = ({ state, details, dispatch }) => {
  return (
    <>
      {" "}
      <button
        className={classNames(
          state.details && state.details.id === details.id && "detective-ui-details-button-selected"
        )}
        onClick={() => {
          dispatch(actionCreators.showDetails(details));
        }}
      >
        details
      </button>
    </>
  );
};

const DetectiveSearch: React.FC<{}> = () => {
  const [state, dispatch] = React.useReducer<React.Reducer<DetectiveDashboardState, Action>>(
    reducer,
    initialState
  );

  const [agents, setAgents] = React.useState<Agent[]>([]);
  return (
    <>
      <form
        className=""
        onSubmit={e => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const email = data.get("email");
          if (typeof email === "string") {
            searchAgents(email)
              .then(agents => {
                setAgents(agents);
              })
              .catch(e => {
                console.error(e);
                setAgents([]);
              });
          }
        }}
      >
        Search: by email:{" "}
        <input name="email" className="border border-gray-500" type="text" placeholder="email" />
      </form>
      <div>
        {agents.map(agent => (
          <div key={agent.id}>
            <span>{agent.name}</span> <span>{agent.email}</span>
            <DetailsButton
              state={state}
              details={{
                id: agent.id,
                entity_type: EntityType.Agent,
                api_call: `agents/${agent.id}`,
              }}
              dispatch={dispatch}
            />
          </div>
        ))}
      </div>
      {state.details && (
        <div className="detective-ui-container">
          <DetailsPane {...state} />
        </div>
      )}
    </>
  );
};

export function useFetch<Data>(url: string) {
  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  React.useEffect(() => {
    const fetchData = async () => {
      if (!url) {
        return;
      }
      const res = await fetch(url, { credentials: "include", cache: "no-cache" });
      if (res.status === 200) {
        const data = await res.json();
        setError(null);
        setData(data);
        setLoading(false);
      } else {
        throw new Error(await res.text());
      }
    };
    fetchData().catch(err => {
      setError(err.toString());
      setLoading(false);
    });
  }, [url]);

  return [loading, error, data] as const;
}

function searchAgents(email: string): Promise<Agent[]> {
  const form = new FormData();
  form.append("email", email);
  return fetch(`${getServerUrl()}/detective_api/search`, {
    method: "POST",
    credentials: "include",
    body: form,
  }).then(data => {
    if (data.status !== 200) {
      throw new Error("failed to search agents");
    }
    return data.json();
  });
}

export default StoreFront;
