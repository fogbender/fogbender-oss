export type AuthorMe = {
  name: string;
  email: string;
  avatarUrl?: string;
};

export type UserMe = {
  id: string;
  name: string;
  email: string;
  image_url?: string;
  widget_hmac: string;
  widget_jwt: string;
  widget_paseto: string;
  fogvited: Fogvite[];
};

export type Fogvite = {
  id: string;
  sender_agent_id: string;
  invite_sent_to_email: string | null;
  fogvite_code: string | null;
  accepted_by_agent_id: string | null;
  deleted_at: string | null;
};

export type AgentRole = "owner" | "admin" | "agent" | "reader" | "app";

export type Agent = {
  id: string;
  email: string;
  name: string;
  role: AgentRole;
  image_url: string;
  inserted_at: string;
  tags: WorkspaceTag[];
};

export type AgentGroup = {
  name: string;
  vendor_id: string;
  agents: Agent[];
};

export type WorkspaceTag = {
  id: string;
  name: string;
  workspace_id: string;
};

export type FeatureOptions = {
  default_group_assignment?: string;
};

// TODO: remove this once we update to TS 4.9
export const satisfy = <T>(x: T) => x;
