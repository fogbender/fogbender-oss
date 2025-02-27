import { atom } from "jotai";

import { type Workspace } from "../../redux/adminApi";

export const llmProviders = ["OpenAI", "Mistral", "Claude", "Gemini", "Self-hosted"];
export type LlmProvider = (typeof llmProviders)[number];
type LlmProviderApiKeys = Record<LlmProvider, string>;
type LlmAssistantIds = Record<LlmProvider, string>;
type LlmToolUrls = Record<string, null | string>;
type LlmToolErrors = Record<string, null | string>;
type LlmToolEnabled = Record<string, boolean>;

export type OnboardingState = {
  vendorId?: string;
  vendorName?: string;
  workspaceId?: string;
  workspaceName?: string;
  workspace?: Workspace;
  widgetId?: string;
  widgetKey?: string;
  provider?: string;
  apiKeys: LlmProviderApiKeys;
  assistantIds: LlmAssistantIds;
  toolUrls: LlmToolUrls;
  toolErrors: LlmToolErrors;
  toolEnabled: LlmToolEnabled;
  slackConfigured?: boolean;
  slackWorkspaceId?: string;
  slackWorkspaceName?: string;
  slackChannelId?: string;
  slackChannelName?: string;
  gitHubConfigured?: boolean;
  fileDownloaded?: boolean;
  aliceOpened?: boolean;
  bobOpened?: boolean;
};

export const initialOnboardingState = {
  apiKeys: {},
  assistantIds: {},
  toolUrls: {},
  toolErrors: {},
  toolEnabled: {}, // maybe switch the rest to singular - this feels better
  fileDownloaded: false,
  aliceOpened: false,
  bobOpened: false,
} as OnboardingState;

export const onboardingStateAtom = atom(initialOnboardingState);
