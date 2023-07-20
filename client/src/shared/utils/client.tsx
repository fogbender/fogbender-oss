import { QueryClient } from "react-query";

import type { RosterViewOptions } from "../app/Roster";

export const queryClient = new QueryClient();

export const queryKeys = {
  customers: (workspaceId: string) => ["customers", workspaceId],
  customerSearch: (workspaceId: string | undefined, rosterSearchValue: string | undefined) => [
    "customer_search",
    workspaceId,
    rosterSearchValue,
  ],
  internalCustomers: (workspaceId: string | undefined) => ["internal_customer", workspaceId],
  roomsByTagName: (workspaceId: string | undefined, tagName: string | undefined) => [
    "rooms_by_tag",
    workspaceId,
    tagName,
  ],
  roomsByTagNames: (workspaceId: string | undefined, tagNames: string[] | undefined) => [
    "rooms_by_tags",
    workspaceId,
    tagNames,
  ],
  issueInfo: (workspaceId: string, integrationProjectId: string, issueId: string) => [
    "issue_info",
    workspaceId,
    integrationProjectId,
    issueId,
  ],
  rosterViewSubscription: (options: RosterViewOptions) => ["roster_view_subscription", options],
  rosterSearchByString: (
    workspaceId: string | undefined,
    helpdeskId: string | undefined,
    searchString: string,
    termFields: string
  ) => ["roster_search_by_string", workspaceId, helpdeskId, searchString, termFields] as const,
};
