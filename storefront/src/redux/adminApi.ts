import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";
import { maybeUndefined, type Agent, type WorkspaceTag as Tag } from "fogbender-client/src/shared";

import type { RootState } from ".";

export type { Agent, Tag };

export type Vendor = {
  id: string;
  name: string;
  agent_scheduling_enabled?: boolean;
  status: "active" | "archived";
  inserted_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type VendorInvite = {
  invite_id: string;
  vendor: Vendor;
  from_agent: Omit<Agent, "role" | "inserted_at">;
  email: string;
  code: string;
  role: "admin" | "agent";
};

export type User = {
  id: string;
  email: string;
  name: string;
  external_uid: string;
  avatar_url?: string;
  tags: Tag[];
  last_activity_at: string;
  inserted_at: string;
  deleted_at: string;
  deleted_by_agent_id: string;
  email_verified: string;
};

export type Invite = {
  invite_id: string;
  email: string;
  role: "admin" | "agent";
  from_agent: Agent;
  inserted_at: string;
};

export type WorkspaceSignatureType = "hmac" | "paseto" | "jwt";

export type Workspace = {
  id: string;
  name: string;
  triage_name?: string;
  description: string;
  signature_type: WorkspaceSignatureType | null;
  inserted_at: number;
  vendor_id: number;
  deleted_at: number | null;
};

export type CrmValue = string | boolean | Record<string, string>;

export type CrmConnection = {
  id: string;
  authorization: {
    status: string;
  };
  connector: {
    authorizer_prototype_slug: string;
    mark_url: string;
    name: string;
    short_description: string;
    id: string;
  };
};

export const actionCreators = {
  setVendors: createAction<{ vendors: Vendor[] | null }, "SET_VENDORS">("SET_VENDORS"),
  vendorsTick: createAction<void, "VENDORS_TICK">("VENDORS_TICK"),
  setAgents: createAction<{ vendorId: string; agents: Agent[] }, "SET_AGENTS">("SET_AGENTS"),
  setInvites: createAction<{ vendorId: string; invites: Invite[] }, "SET_INVITES">("SET_INVITES"),
  setWorkspaces: createAction<
    { vendorId: string; workspaces: Workspace[] | null },
    "SET_WORKSPACES"
  >("SET_WORKSPACES"),
  setTags: createAction<{ workspaceId: string; tags: Tag[] }, "SET_TAGS">("SET_TAGS"),
  setUsers: createAction<{ helpdeskId: string; users: User[] }, "SET_USERS">("SET_USERS"),
  setWorkspaceFeatureFlags: createAction<
    { workspaceId: string; featureFlags: string[] },
    "SET_WORKSPACE_FEATURE_FLAGS"
  >("SET_WORKSPACE_FEATURE_FLAGS"),
  setFeatureFlags: createAction<{ featureFlags: string[] }, "SET_FEATURE_FLAGS">(
    "SET_FEATURE_FLAGS"
  ),
};

type ReducerState = {
  vendors?: Vendor[];
  vendorsTick: number;
  agentsByVendor: { [id: string]: Agent[] };
  invitesByVendor: { [id: string]: Invite[] };
  workspacesByVendor: { [id: string]: Workspace[] };
  tagsByWorkspace: { [id: string]: Tag[] };
  usersByHelpdesk: { [id: string]: User[] };
  featureFlagsByWorkspace: { [id: string]: string[] };
  featureFlags: string[];
};

const initialState: ReducerState = {
  vendors: undefined,
  vendorsTick: 0,
  agentsByVendor: {},
  invitesByVendor: {},
  workspacesByVendor: {},
  tagsByWorkspace: {},
  usersByHelpdesk: {},
  featureFlagsByWorkspace: {},
  featureFlags: [],
};

export const reducer = createReducer(initialState, builder => {
  builder.addCase(actionCreators.setVendors, (state, action) => {
    const { vendors } = action.payload;
    if (vendors) {
      state.vendors = vendors;
    } else {
      state.vendors = undefined;
    }
  });

  builder.addCase(actionCreators.vendorsTick, (state, _action) => {
    state.vendorsTick++;
  });

  builder.addCase(actionCreators.setAgents, (state, action) => {
    const { vendorId, agents } = action.payload;
    if (agents) {
      state.agentsByVendor[vendorId] = agents;
    } else {
      delete state.agentsByVendor[vendorId];
    }
  });

  builder.addCase(actionCreators.setInvites, (state, action) => {
    const { vendorId, invites } = action.payload;
    if (invites) {
      state.invitesByVendor[vendorId] = invites;
    } else {
      delete state.invitesByVendor[vendorId];
    }
  });

  builder.addCase(actionCreators.setWorkspaces, (state, action) => {
    const { vendorId, workspaces } = action.payload;
    if (vendorId && workspaces) {
      state.workspacesByVendor[vendorId] = workspaces;
    } else if (vendorId) {
      delete state.workspacesByVendor[vendorId];
    }
  });

  builder.addCase(actionCreators.setTags, (state, action) => {
    const { workspaceId, tags } = action.payload;
    if (workspaceId && tags) {
      state.tagsByWorkspace[workspaceId] = tags;
    } else if (workspaceId) {
      delete state.tagsByWorkspace[workspaceId];
    }
  });

  builder.addCase(actionCreators.setUsers, (state, action) => {
    const { helpdeskId, users } = action.payload;
    if (helpdeskId && users) {
      state.usersByHelpdesk[helpdeskId] = users;
    } else if (helpdeskId) {
      delete state.usersByHelpdesk[helpdeskId];
    }
  });

  builder.addCase(actionCreators.setWorkspaceFeatureFlags, (state, action) => {
    const { workspaceId, featureFlags } = action.payload;
    if (workspaceId && featureFlags) {
      state.featureFlagsByWorkspace[workspaceId] = featureFlags;
    } else if (workspaceId) {
      delete state.featureFlagsByWorkspace[workspaceId];
    }
  });

  builder.addCase(actionCreators.setFeatureFlags, (state, action) => {
    const { featureFlags } = action.payload;
    state.featureFlags = featureFlags;
  });
});

export const vendorsTick = (state: RootState) => state.adminApi.vendorsTick;

export const selectWorkspacesByVendor = (state: RootState) => state.adminApi.workspacesByVendor;

export const selectAgentsByVendor = (state: RootState) => state.adminApi.agentsByVendor;

export const selectTagsByWorkspace = (state: RootState) => state.adminApi.tagsByWorkspace;

export const selectUsersByHelpdesk = (state: RootState) => state.adminApi.usersByHelpdesk;

export const selectFeatureFlagsByWorkspace = (state: RootState) =>
  state.adminApi.featureFlagsByWorkspace;

export const selectFeatureFlags = () =>
  createSelector(
    (state: RootState) => state.adminApi.featureFlags,
    featureFlags => featureFlags
  );

export const selectAgents = (vendorId: string) =>
  createSelector(selectAgentsByVendor, agentsByVendor =>
    maybeUndefined(agentsByVendor && agentsByVendor[vendorId])
  );

export const selectInvitesByVendor = (state: RootState) => state.adminApi.invitesByVendor;

export const selectInvites = (vendorId: string) =>
  createSelector(selectInvitesByVendor, invitesByVendor =>
    maybeUndefined(invitesByVendor && invitesByVendor[vendorId])
  );

export const selectAgentRole = (vendorId: string, agentId: string | undefined) =>
  createSelector(selectAgentsByVendor, agentsByVendor => {
    if (vendorId && agentId && agentsByVendor) {
      const agents = agentsByVendor[vendorId];

      if (agents) {
        const agent = agents.find(a => a.id === agentId);

        return agent && agent.role;
      }
    }
    return;
  });

export const selectWorkspaces = (vendorId?: string) =>
  createSelector(
    selectWorkspacesByVendor,
    workspacesByVendor =>
      (workspacesByVendor && vendorId && workspacesByVendor[vendorId]) || undefined
  );

export const selectTags = (workspaceId?: string) =>
  createSelector(selectTagsByWorkspace, tagsByWorkspace =>
    workspaceId && tagsByWorkspace ? tagsByWorkspace[workspaceId] || [] : []
  );

export const selectUsers = (helpdeskId: string | undefined) =>
  createSelector(selectUsersByHelpdesk, usersByHelpdesk =>
    helpdeskId ? usersByHelpdesk[helpdeskId] : undefined
  );

export const selectWorkspaceFeatureFlags = (workspaceId?: string) =>
  createSelector(selectFeatureFlagsByWorkspace, featureFlagsByWorkspace =>
    workspaceId && featureFlagsByWorkspace ? featureFlagsByWorkspace[workspaceId] || [] : []
  );
