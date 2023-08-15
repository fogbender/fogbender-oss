import { TabHeaderWrapper, TabListHeaderWrapper } from "fogbender-client/src/shared";
import { EmailNotificationsSettings } from "fogbender-client/src/shared/app/EmailNotificationsSettings";
import React from "react";
import { lazily } from "react-lazily";
import { Link, Route, Routes } from "react-router-dom";

import { Workspace } from "../../redux/adminApi";

import { AIControls } from "./AIControls";
import { AvatarLibrary } from "./AvatarLibrary";
import { CommsIntegrations } from "./CommsIntegrations";
import { CrmIntegrationsWrapper as CrmIntegrations } from "./CrmIntegrationsWrapper";
import { DefaultGroupAssignments } from "./DefaultGroupAssignments";
import { EmailForwarding } from "./EmailForwarding";
import { IncidentResponseIntegrations } from "./IncidentResponseIntegrations";
import { Integrations as IssueTrackerIntegrations } from "./Integrations";
import { TagsList } from "./TagsList";

const { Customize } = lazily(() => import("./FloatingWidgetShowcase"));
const { SnippetControls } = lazily(() => import("./SnippetControls"));

export const SettingsPage: React.FC<{
  vendorId: string;
  workspace?: Workspace;
  ourEmail?: string;
}> = ({ vendorId, workspace, ourEmail }) => {
  return (
    <Routes>
      <Route
        path="embed"
        element={
          <div className="pb-20">
            <SettingsTabs tab="embed" />
            {workspace && <SnippetControls workspace={workspace} />}
          </div>
        }
      />
      <Route
        path="ai"
        element={
          <div className="pb-20">
            <SettingsTabs tab="ai" />
            {workspace && <AIControls workspace={workspace} />}
          </div>
        }
      />
      <Route
        path="integrations"
        element={
          <div className="pb-20">
            <SettingsTabs tab="integrations" />
            {workspace && (
              <div className="flex flex-col gap-8 pb-20">
                <IncidentResponseIntegrations workspace={workspace} />
                <IssueTrackerIntegrations workspace={workspace} />
                <CommsIntegrations workspace={workspace} />
                <CrmIntegrations workspace={workspace} />
              </div>
            )}
          </div>
        }
      />
      <Route
        path="*"
        element={
          <div>
            <SettingsTabs tab="settings" />
            <div className="flex flex-col gap-8 pb-20">
              {workspace && <EmailForwarding workspace={workspace} />}
              {workspace && <AvatarLibrary workspace={workspace} />}
              {workspace && <TagsList designatedWorkspaceId={workspace.id} />}
            </div>
          </div>
        }
      />
      <Route
        path="notifications"
        element={
          <div>
            <SettingsTabs tab="notifications" />
            <div className="flex flex-col gap-8 pb-20">
              {workspace && (
                <div className="flex flex-wrap gap-4">
                  <EmailNotificationsSettings workspaceId={workspace.id} ourEmail={ourEmail} />
                  <DefaultGroupAssignments vendorId={vendorId} workspaceId={workspace.id} />
                </div>
              )}
            </div>
          </div>
        }
      />
      <Route path="embed/customize/" element={<Customize />} />
    </Routes>
  );
};

const SettingsTabs: React.FC<{
  tab: "embed" | "settings" | "ai" | "integrations" | "notifications";
}> = ({ tab }) => {
  const secondaryTabs = ["embed", "ai", "integrations", "notifications"];
  return (
    <div className="max-w-min lg:max-w-full pr-4 lg:pr-0 mt-2 mb-4 sm:mt-8 sm:mb-8 w-full bg-white rounded-xl fog:box-shadow-s flex flex-col gap-4">
      <TabListHeaderWrapper>
        <Link
          to={tab === "embed" ? "." : secondaryTabs.includes(tab) ? "../embed" : "embed"}
          className="flex-1 md:flex-none no-underline group"
        >
          <TabHeaderWrapper selected={tab === "embed"}>Embedding instructions</TabHeaderWrapper>
        </Link>
        <Link
          to={secondaryTabs.includes(tab) ? ".." : "."}
          className="flex-1 md:flex-none no-underline group"
        >
          <TabHeaderWrapper selected={tab === "settings"}>Workspace configuration</TabHeaderWrapper>
        </Link>
        <Link
          to={
            tab === "integrations"
              ? "."
              : secondaryTabs.includes(tab)
              ? "../integrations"
              : "integrations"
          }
          className="flex-1 md:flex-none no-underline group"
        >
          <TabHeaderWrapper selected={tab === "integrations"}>Integrations</TabHeaderWrapper>
        </Link>
        <Link
          to={tab === "ai" ? "." : secondaryTabs.includes(tab) ? "../ai" : "ai"}
          className="flex-1 md:flex-none no-underline group"
        >
          <TabHeaderWrapper selected={tab === "ai"}>
            <code>AI</code>
          </TabHeaderWrapper>
        </Link>
        <Link
          to={
            tab === "notifications"
              ? "."
              : secondaryTabs.includes(tab)
              ? "../notifications"
              : "notifications"
          }
          className="flex-1 md:flex-none no-underline group"
        >
          <TabHeaderWrapper selected={tab === "notifications"}>Notifications</TabHeaderWrapper>
        </Link>
      </TabListHeaderWrapper>
    </div>
  );
};
