import Amplify, { Auth } from "aws-amplify";
import { AgentToken, WsProvider } from "fogbender-proto";
import { Provider as JotaiProvider } from "jotai";
import React from "react";

import { getEnv, getEnvConfig } from "../constants/Env";

type Agent = {
  id: string;
  name: string;
  email: string;
  image_url?: string;
  widget_hmac: string;
  widget_jwt: string;
  widget_paseto: string;
};

type Vendor = {
  id: string;
  name: string;
  inserted_at: string;
};

type WorkspaceSignatureType = "hmac" | "paseto" | "jwt";

type Workspace = {
  id: string;
  name: string;
  signature_type: WorkspaceSignatureType | null;
  inserted_at: string;
};

type FogbenderContext = ReturnType<typeof useProviderValue>;
const FogbenderContext = React.createContext<FogbenderContext | undefined>(undefined);
FogbenderContext.displayName = "FogbenderContext";

function useProviderValue() {
  const { serverUrl, serverApiUrl } = getEnvConfig();

  const [agentToken, setAgentToken] = React.useState<AgentToken>();
  const [agent, setAgent] = React.useState<Agent>();
  const [vendorId, setVendorId] = React.useState<string>();
  const [workspaceId, setWorkspaceId] = React.useState<string>();

  const [vendors, setVendors] = React.useState<Vendor[]>([]);
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);

  const login = React.useCallback(async (jwt: string) => {
    const response = await fetch(serverUrl + "/auth/cognito", {
      credentials: "include",
      method: "POST",
      body: jwt,
    });
    return (await response.json()) as { ok: boolean; login_callback: null | string };
  }, []);

  const fetchAgent = React.useCallback(async () => {
    const agentResponse = await fetch(serverApiUrl + "/agents/me");
    const agent = (await agentResponse.json()) as Agent;
    setAgent(agent);
  }, []);

  const fetchVendors = React.useCallback(async () => {
    const vendorsResponse = await fetch(serverApiUrl + "/vendors");
    const vendors = (await vendorsResponse.json()) as Vendor[];
    setVendors(vendors);
  }, []);

  const fetchWorkspaces = React.useCallback(async () => {
    if (!vendorId) {
      setWorkspaces([]);
      return;
    }
    const workspacesResponse = await fetch(`${serverApiUrl}/vendors/${vendorId}/workspaces`);
    const workspaces = (await workspacesResponse.json()) as Workspace[];
    setWorkspaces(workspaces);
  }, [vendorId]);

  const run = React.useCallback(async () => {
    const jwt = (await Auth.currentSession()).getIdToken().getJwtToken();
    const { ok, login_callback: loginCallback } = await login(jwt);
    if (ok) {
      await fetchAgent();
      await fetchVendors();
      await fetchWorkspaces();
    }
  }, [fetchAgent, fetchVendors, fetchWorkspaces]);

  React.useEffect(() => {
    run();
  }, [run]);

  React.useEffect(() => {
    setWorkspaces([]);
    setWorkspaceId(undefined);
  }, [vendorId]);

  React.useEffect(() => {
    if (agent && vendorId) {
      setAgentToken(currentToken => {
        if (currentToken?.agentId !== agent.id || currentToken?.vendorId !== vendorId) {
          return { agentId: agent.id, vendorId };
        } else {
          return currentToken;
        }
      });
    } else {
      setAgentToken(undefined);
    }
  }, [agent, vendorId]);

  return {
    agentToken,
    agent,
    vendorId,
    workspaceId,
    setVendorId,
    setWorkspaceId,
    vendors,
    workspaces,
  };
}

export const FogbenderProvider = props => {
  const value = useProviderValue();
  const [wsClient] = React.useState(() => ({
    getEnv,
    getServerApiUrl: () => getEnvConfig().serverApiUrl,
  }));
  return (
    <FogbenderContext.Provider value={value}>
      <WsProvider client={wsClient} token={value.agentToken} workspaceId={value.workspaceId}>
        <JotaiProvider>{props.children}</JotaiProvider>
      </WsProvider>
    </FogbenderContext.Provider>
  );
};

export function useFogbender() {
  const context = React.useContext(FogbenderContext);
  if (context === undefined) {
    throw new Error(`useFogbender must be used within a FogbenderContext`);
  }
  return context;
}
