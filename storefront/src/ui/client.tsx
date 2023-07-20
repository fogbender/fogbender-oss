import { QueryClient } from "react-query";
import wretch from "wretch";

import { getServerUrl } from "../config";

export const queryClient = new QueryClient();

export const queryKeys = {
  agents: (vendorId: string) => ["agents", vendorId],
  users: (helpdeskId: string) => ["users", helpdeskId],
  customers: (workspaceId: string | undefined) => ["customers", workspaceId || "N/A"],
  customer: (helpdeskId: string) => ["customer", helpdeskId],
  featureOptions: (workspaceId: string) => ["feature_options", workspaceId],
  crmConnections: (workspaceId: string) => ["crm_connections", workspaceId],
  crmConnection: (id: string) => ["crm_connection", id],
  integrations: (workspaceId: string | undefined) => ["integrations", workspaceId || "N/A"],
  invites: (vendorId: string) => ["invites", vendorId],
  vendorInvites: () => ["vendor_invites"],
  tags: (workspaceId: string | undefined) => ["tags", workspaceId || "N/A"],
  sharedChannels: (workspaceId: string) => ["shared_channels", workspaceId],
  crmLinkAccounts: (workspaceId: string, linkId: string) => ["crm_accounts", workspaceId, linkId],
  vendors: () => ["vendors"],
  workspaces: (vendorId: string | undefined) => ["workspaces", vendorId || "N/A"],
  verifiedDomains: (vendorId: string) => ["verified_domains", vendorId],
  isGenericDomain: (domain: string) => ["is_generic_domain", domain],
  roomsByTagName: (workspaceId: string | undefined, tagName: string | undefined) => [
    "rooms_by_tag",
    workspaceId,
    tagName,
  ],
  embeddingsSources: (workspaceId: string) => ["embeddings_sources", workspaceId],
  agentGroups: (vendorId: string) => ["agent_groups", vendorId],
  pagerDurySchedules: (workspaceId: string, projectId: string) => [
    "pagerduty_schedules",
    workspaceId,
    projectId,
  ],
  vendorIntegrations: (vendorId: string | undefined) => ["vendor_integrations", vendorId],
  onboardingChecklist: (vendorId: string | undefined) => ["onboarding_checklist", vendorId],
};

export async function fetchData<T>(url: string): Promise<T> {
  const response = await fetch(`${getServerUrl()}/${url}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} ${await response.text()}`);
  }
  return response.json();
}
export const apiServer = wretch(getServerUrl(), {
  credentials: "include",
});
