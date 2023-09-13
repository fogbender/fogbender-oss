import browser from "browser-detect";
import classNames from "classnames";
import {
  Agent,
  AgentRole,
  AnyToken,
  App as AgentApp,
  atomWithRealTimeLocalStorage,
  Avatar,
  ConfirmDialog,
  FancyMenuItem,
  GalleryModal,
  IconGithub,
  Icons,
  Integration,
  IsIdleProvider,
  LocalStorageKeys,
  Modal,
  muteNotificationsAtom,
  muteSoundAtom,
  SafeLocalStorage,
  showFocusedRosterAtom,
  showOutlookRosterAtom,
  Tag,
  ThinButton,
  useIsIdle,
  VendorBilling,
  WsProvider,
} from "fogbender-client/src/shared";
import { Logout, SwitchOff, SwitchOn } from "fogbender-client/src/shared/components/Icons";
import { Provider as JotaiProvider, useAtom } from "jotai";
import React from "react";
import { lazily } from "react-lazily";
import { QueryClientProvider, useMutation, useQuery } from "react-query";
import { useSelector } from "react-redux";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Title } from "reactjs-meta";
import wretch from "wretch";

import AdminBackgroundImage from "../assets/codioful-formerly-gradienta-J6LMHbdW1k8-unsplash.png?url";
import logo from "../assets/logo.svg?url";
import { defaultEnv, getServerUrl } from "../config";
import { Config } from "../features/config/Config";
import { Vendor, VendorInvite, Workspace } from "../redux/adminApi";
import {
  getAuthenticatedAgentId,
  selectAuthorMe,
  selectUserImageUrl,
  selectUserName,
} from "../redux/session";
import { FontAwesomeTimes } from "../shared/font-awesome/Times";

import { getIntegrationDetails as getAIIntegrationDetails } from "./Admin/AIIntegrations";
import { Billing } from "./Admin/Billing";
import { client } from "./Admin/client";
import { getIntegrationDetails as getCommsIntegrationDetails } from "./Admin/CommsIntegrations";
import { CreateVendorForm } from "./Admin/CreateVendorForm";
import { CreateWorkspaceForm } from "./Admin/CreateWorkspaceForm";
import { CustomerInfoPane } from "./Admin/CustomerInfoPane";
import { CustomersHome } from "./Admin/CustomersHome";
import { HeadlessForSupport, useFullScreenClientUrl } from "./Admin/HeadlessForSupport";
import { HeadlessIntegration, UnreadBadge } from "./Admin/HeadlessIntegration";
import { HelpWidget } from "./Admin/HelpWidget";
import { getIntegrationDetails as getIssueTrackerIntegrationDetails } from "./Admin/Integrations";
import { NoVendors } from "./Admin/NoVendors";
import { OnboardingChecklist } from "./Admin/OnboardingChecklist";
import { Team } from "./Admin/Team";
import { UpdateVendorForm } from "./Admin/UpdateVendorForm";
import { UpdateWorkspaceForm } from "./Admin/UpdateWorkspaceForm";
import { UsersInfoPane } from "./Admin/UsersInfoPane";
import { AcceptInviteButton, BadInviteModal, DeclineInviteButton } from "./Admin/VendorInvite";
import { apiServer, queryClient, queryKeys } from "./client";
import { useDesignatedVendorNameCache, useDesignatedWorkspaceNameCache } from "./store";
import { useLogout } from "./useLogout";
import { useOpenRoomFromBrowserLocation } from "./useOpenRoomFromBrowserLocation";
import { useCheckCurrentSession } from "./useSessionApi";
import { useVendorsQuery } from "./useVendor";
import { useWorkspaceIntegrationsQuery } from "./useWorkspaceIntegrations";

const { AnalyticsPage } = lazily(() => import("./Admin/features/Analytics/AnalyticsPage"));
const { ComponentsShowcase } = lazily(() => import("./ComponentsShowcase"));
const { SettingsPage } = lazily(() => import("./Admin/SettingsPage"));

(JotaiProvider as any).displayName = "JotaiProvider";

export const Admin = () => {
  const navigate = useNavigate();

  const vendorMatch = useMatch("/admin/vendor/:vid/*");
  const workspaceMatch = useMatch("/admin/vendor/:vid/workspace/:wid/*");
  const workspacesMatch = useMatch("/admin/vendor/:vid/workspaces");
  const isAgentApp = !!useMatch("/admin/vendor/:vid/workspace/:wid/chat/*");
  const adminMatch = useMatch("/admin");
  const adminRedirectMatch = useMatch("/admin/-/*");
  const workspaceRedirectMatch = useMatch("/admin/vendor/:vid/-/*");

  const vendors = useVendorsQuery();

  const designatedVendorId = vendorMatch?.params?.vid || undefined;
  const designatedVendor = vendors?.find(x => x.id === designatedVendorId && !x.deleted_at);

  React.useEffect(() => {
    if (designatedVendor?.deleted_at) {
      navigate("/admin");
    } else if (designatedVendor) {
      SafeLocalStorage.setItem(LocalStorageKeys.DesignatedVendorId, designatedVendor.id);
    }
  }, [navigate, designatedVendor]);

  const { data: workspaces } = useQuery<Workspace[]>(
    queryKeys.workspaces(designatedVendorId),
    () =>
      fetch(`${getServerUrl()}/api/vendors/${designatedVendorId}/workspaces`, {
        credentials: "include",
      }).then(res => {
        if (res.status === 200) {
          return res.json();
        } else if (res.status === 403) {
          navigate("/admin");
        } else {
          return [];
        }
        return;
      }),
    {
      enabled: designatedVendorId !== undefined,
    }
  );

  const designatedWorkspaceId = workspaceMatch?.params?.wid;
  const designatedWorkspace = workspaces?.find(x => x.id === designatedWorkspaceId);

  const sortedWorkspaces = React.useMemo(
    () =>
      [...(workspaces || [])]
        .filter(w => !w.deleted_at)
        .sort((a, b) => {
          if (a.inserted_at < b.inserted_at) {
            return 1;
          }
          if (a.inserted_at > b.inserted_at) {
            return -1;
          }
          return 0;
        }),
    [workspaces]
  );

  const teamMode =
    !!designatedVendorId && !designatedWorkspaceId && vendorMatch?.params["*"]?.startsWith("team");
  const billingMode =
    !!designatedVendorId &&
    !designatedWorkspaceId &&
    vendorMatch?.params["*"]?.startsWith("billing");
  const settingsMode = !!designatedWorkspace && workspaceMatch?.params["*"]?.startsWith("settings");
  const customersMode =
    !!designatedWorkspace && workspaceMatch?.params["*"]?.startsWith("customers");
  const analyticsMode =
    !!designatedWorkspace && workspaceMatch?.params["*"]?.startsWith("analytics");
  const supportMode =
    !!designatedVendorId &&
    !designatedWorkspaceId &&
    vendorMatch?.params["*"]?.startsWith("support");

  const ourAgentId = useSelector(getAuthenticatedAgentId);
  const [agentToken, setAgentToken] = React.useState<AnyToken>();

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents(designatedVendorId || "N/A"),
    queryFn: () => apiServer.get(`/api/vendors/${designatedVendorId}/agents`).json<Agent[]>(),
    enabled: !!designatedVendorId,
  });

  const ourRole = agents?.find(a => a.id === ourAgentId)?.role;

  const homeMode =
    teamMode ||
    billingMode ||
    adminMatch !== null ||
    workspacesMatch !== null ||
    adminRedirectMatch !== null ||
    workspaceRedirectMatch !== null;

  React.useEffect(() => {
    setAgentToken(token => {
      if (
        token &&
        "agentId" in token &&
        token.vendorId === designatedVendorId &&
        token.agentId === ourAgentId
      ) {
        return token;
      } else if (designatedVendorId && ourAgentId) {
        return { vendorId: designatedVendorId, agentId: ourAgentId };
      } else {
        return undefined;
      }
    });
  }, [designatedVendorId, ourAgentId]);

  const [suspendConnection, setSuspendConnection] = React.useState(false);

  // FIXME use proper way to preload agents/workspaces, without always reloading data
  // Preload data

  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("code");

  const { data: vendorInvitesData } = useQuery<VendorInvite[]>(queryKeys.vendorInvites(), () => {
    const url = inviteCode
      ? `${getServerUrl()}/api/vendor_invites/${inviteCode}`
      : `${getServerUrl()}/api/vendor_invites`;
    return fetch(url, {
      credentials: "include",
    }).then(res => res.json());
  });

  const [notificationsPermission, setNotificationsPermission] = React.useState<
    NotificationPermission | "hide"
  >(window.Notification?.permission);

  const showOnboarding =
    vendors !== undefined &&
    vendors.length === 0 &&
    vendorInvitesData !== undefined &&
    vendorInvitesData.length === 0;

  const isIdle = useIsIdle();

  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = React.useState<boolean>();

  const [editWorkspace, setEditWorkspace] = React.useState<Workspace>();
  const [deleteWorkspace, setDeleteWorkspace] = React.useState<Workspace>();

  React.useLayoutEffect(() => {
    const className = "admin";
    const classList = document.querySelector("html")?.classList;
    classList?.add(className);
    return () => classList?.remove(className);
  }, []);

  const authorMe = useSelector(selectAuthorMe);

  const { data: workspaceIntegrations } = useWorkspaceIntegrationsQuery(designatedWorkspaceId);

  const { data: workspaceTags } = useQuery<Tag[]>(
    queryKeys.tags(designatedWorkspaceId),
    () =>
      fetch(`${getServerUrl()}/api/workspaces/${designatedWorkspaceId}/tags`, {
        credentials: "include",
      }).then(res => res.json()),
    { enabled: designatedWorkspaceId !== undefined }
  );

  const { data: vendorIntegrations } = useQuery({
    queryKey: queryKeys.vendorIntegrations(designatedVendorId),
    queryFn: () =>
      apiServer
        .get(`/api/vendors/${designatedVendorId}/integrations`)
        .json<{ workspace_id: string; integrations: Integration[] }[]>(),
    enabled: !!designatedVendorId,
  });

  const checklistDoneHiddenAtom = React.useMemo(
    () => atomWithRealTimeLocalStorage(`onboarding.hide.${designatedVendorId}`, false),
    [designatedVendorId]
  );
  const [onboardingChecklistDone, setOnboardingChecklistDone] = useAtom(checklistDoneHiddenAtom);

  const countNonReaders = (agents || []).reduce(
    (acc, a) => (["owner", "agent", "admin"].includes(a.role) ? acc + 1 : acc),
    0
  );

  const {
    data: billing,
    isLoading: billingIsLoading,
    status: billingStatus,
  } = useQuery({
    queryKey: queryKeys.billing(designatedVendorId || "N/A"),
    queryFn: () =>
      apiServer.get(`/api/vendors/${designatedVendorId}/billing`).json<VendorBilling>(),
    enabled: !!designatedVendorId,
  });

  const freeSeats = billing?.free_seats || 2;

  const paidSeats = billing?.paid_seats || 0;

  const countInViolation =
    (countNonReaders - freeSeats < 0 ? 0 : countNonReaders - freeSeats) - paidSeats;

  return (
    <div className={classNames("flex flex-col h-full", isAgentApp && "overflow-hidden")}>
      <HeadlessIntegration />
      {designatedVendorId &&
        !billingIsLoading &&
        billing &&
        ourRole &&
        ["owner", "admin", "agent"].includes(ourRole) &&
        billing &&
        (billing.delinquent || countInViolation > 0) && (
          <SubscriptionRequiredBanner
            admins={agents.filter(a => ["owner", "admin"].includes(a.role))}
            ourRole={ourRole}
            vendorId={designatedVendorId}
            countInViolation={countInViolation}
            billing={billing}
          />
        )}
      <NotificationsPermissionBanner
        notificationsPermission={notificationsPermission}
        setNotificationsPermission={setNotificationsPermission}
      />
      <div
        className="relative flex flex-col flex-1 overflow-hidden"
        style={{
          backgroundImage: `url(${AdminBackgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "50% 0%",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="relative bg-blue-50">
          <div className="absolute bottom-0 w-full h-0 border-b border-blue-200" />
          <div className="relative flex items-center justify-between px-4 w-full max-w-screen-xl mx-auto">
            <Breadcrumbs
              designatedVendorId={designatedVendorId}
              designatedVendor={designatedVendor}
              designatedWorkspaceId={designatedWorkspaceId}
              designatedWorkspace={designatedWorkspace}
              settingsMode={settingsMode}
              customersMode={customersMode}
              supportMode={supportMode}
              analyticsMode={analyticsMode}
              isAgentApp={isAgentApp}
            />

            <UserMenu
              isIdle={isIdle}
              suspendConnection={suspendConnection}
              setSuspendConnection={setSuspendConnection}
            />
          </div>
        </div>
        <div
          className={classNames(
            !isAgentApp ? "overflow-auto" : "mt-2",
            "w-full h-full",
            supportMode && "pt-2",
            (homeMode || settingsMode) && "fbr-scrollbar"
          )}
        >
          <div
            className={classNames(
              "relative px-4 flex flex-1",
              (homeMode || settingsMode) && "max-w-screen-xl mx-auto",
              "w-full min-h-full"
            )}
          >
            <Routes>
              <Route path="showcase" element={<></>} />
              <Route path="vendor/:vid/workspace/:wid/*" element={<></>} />
              <Route path="vendor/:vid/support" element={<></>} />
              <Route
                path="*"
                element={
                  <Sidebar
                    hidden={showOnboarding}
                    vendorInvites={vendorInvitesData}
                    vendorInviteCode={inviteCode}
                    vendors={vendors}
                    designatedVendorId={designatedVendorId}
                    teamMode={teamMode}
                    billingMode={billingMode}
                    billingStatus={billingStatus}
                    ourRole={ourRole}
                  />
                }
              />
            </Routes>
            <div
              className={classNames(
                "relative z-0 w-full",
                !isAgentApp && "pb-36",
                !isAgentApp && !customersMode && "max-w-screen-xl mx-auto"
              )}
            >
              <Routes>
                <Route path="config" element={<Config />} />
                {showOnboarding && (
                  <Route
                    path=""
                    element={
                      <NoVendors
                        onDone={() => queryClient.invalidateQueries(queryKeys.vendors())}
                      />
                    }
                  />
                )}
                {defaultEnv !== "prod" && (
                  <Route path="/showcase" element={<ComponentsShowcase />} />
                )}
                <Route
                  path="vendor/:vid/support"
                  element={
                    <div className="absolute inset-0 -mt-2 -mx-4 mb-0">
                      <HelpWidget vendorId={designatedVendorId} />
                    </div>
                  }
                />
                <Route path="integrations/:integration" element={<AdminIntegrationsRedirect />} />
                <Route path="-/*" element={<AdminRedirect vendors={vendors} />} />
                <Route
                  path="vendor/:vid/-/*"
                  element={
                    <AdminVendorRedirect
                      vendors={vendors}
                      workspaces={workspaces}
                      onCreateWorkspace={() => {
                        navigate(`/admin/vendor/${designatedVendorId}/workspaces`);
                        setIsCreateWorkspaceModalOpen(true);
                      }}
                    />
                  }
                />
                <Route path="support" element={<AdminSupport vendors={vendors} />} />
                <Route
                  path="vendor/:vid/workspaces"
                  element={
                    <div className="relative sm:ml-8 pt-10 sm:pt-0">
                      <Link
                        className={classNames(
                          "sm:hidden z-20 absolute top-4 left-0 -mt-2 -ml-4 flex items-center gap-x-2 rounded-r p-2 bg-white fog:box-shadow-s transform transition-transform no-underline",
                          !designatedVendorId
                            ? "-translate-x-full"
                            : "translate-x-0 sm:-translate-x-full"
                        )}
                        to={"/admin"}
                      >
                        <Icons.ArrowBack />
                        <span className="fog:text-caption-l fog:text-link">Organizations</span>
                      </Link>
                      <div className="mt-8 mb-8">
                        {designatedVendorId && ourRole && ["owner", "admin"].includes(ourRole) && (
                          <OnboardingChecklist
                            onboardingChecklistDone={onboardingChecklistDone}
                            setOnboardingChecklistDone={setOnboardingChecklistDone}
                            vendorId={designatedVendorId}
                            workspacesCount={workspaces?.length || 0}
                            vendorIntegrations={vendorIntegrations}
                            onCreateWorkspace={() => {
                              setIsCreateWorkspaceModalOpen(true);
                            }}
                          />
                        )}

                        <div className="mb-8 py-4 px-5 rounded-xl fog:box-shadow bg-white">
                          <ThinButton onClick={() => setIsCreateWorkspaceModalOpen(true)}>
                            {workspaces?.length === 1 ? "Add another workspace" : "Add workspace"}
                          </ThinButton>
                        </div>
                        {sortedWorkspaces.map(w => (
                          <div
                            key={w.id}
                            className="mb-8 py-4 px-5 flex flex-col rounded-xl fog:box-shadow bg-white"
                          >
                            <div className="flex">
                              <Link
                                className="flex-1 flex justify-between items-start fog:text-header3 fog:text-link no-underline cursor-pointer"
                                to={
                                  designatedVendor
                                    ? `/admin/vendor/${designatedVendor.id}/workspace/${w.id}/chat`
                                    : "./"
                                }
                              >
                                <div
                                  className="pb-2 max-md:w-44 md:max-lg:w-64 max-lg:truncate"
                                  title={w.name}
                                >
                                  {w.name}
                                </div>
                                <div className="mt-2 shrink-0">
                                  <UnreadBadge workspaceId={w.id} expanded={true} />
                                </div>
                              </Link>
                              <button
                                className="flex items-start p-1 ml-2 -mr-2 text-gray-500 hover:text-black cursor-pointer"
                                onClick={() => setEditWorkspace(w)}
                              >
                                <Icons.Gear className="w-6" />
                              </button>
                            </div>
                            {w.description !== null && (
                              <div className="fog:text-body-m text-black">{w.description}</div>
                            )}
                            <div className="flex flex-col gap-4 sm:flex-row sm:gap-8 mt-4">
                              <Link
                                className="fog:text-link no-underline cursor-pointer"
                                to={
                                  designatedVendor
                                    ? `/admin/vendor/${designatedVendor.id}/workspace/${w.id}/settings/embed`
                                    : "./"
                                }
                              >
                                Embedding instructions
                              </Link>
                              <Link
                                className="fog:text-link no-underline cursor-pointer flex gap-2 items-center"
                                to={
                                  designatedVendor
                                    ? `/admin/vendor/${designatedVendor.id}/workspace/${w.id}/settings`
                                    : "./"
                                }
                              >
                                <span>Settings</span>
                                <div className="flex gap-2">
                                  {vendorIntegrations
                                    ?.find(i => i.workspace_id === w.id)
                                    ?.integrations?.map(i => {
                                      let icon = getIssueTrackerIntegrationDetails(i)?.icon;

                                      if (!icon) {
                                        icon = getCommsIntegrationDetails(i)?.icon;
                                      }

                                      if (!icon) {
                                        icon = getAIIntegrationDetails(i)?.icon;
                                      }

                                      return icon ? (
                                        <span key={i.id} className="w-5">
                                          {icon}
                                        </span>
                                      ) : null;
                                    })}
                                </div>
                              </Link>
                              <Link
                                className="fog:text-link no-underline cursor-pointer"
                                to={
                                  designatedVendor
                                    ? `/admin/vendor/${designatedVendor.id}/workspace/${w.id}/customers`
                                    : "./"
                                }
                              >
                                Customers
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                      {designatedVendorId && (
                        <div className="mt-8 flex gap-x-4 items-center fog:text-body-l">
                          <div>
                            <p>
                              Questions or comments? Ping us in{" "}
                              <Link to={`/admin/vendor/${designatedVendorId}/support`}>
                                Support
                              </Link>
                              !
                            </p>
                            <p className="fog:text-body-xs">
                              (A good way to see what support with Fogbender feels like from a
                              customer’s perspective)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  }
                />
                <Route
                  path="vendor/:vid/workspace/:wid/settings/*"
                  element={
                    designatedVendorId &&
                    designatedWorkspaceId &&
                    agentToken && (
                      <div>
                        <WsProvider
                          token={agentToken}
                          workspaceId={designatedWorkspaceId}
                          isIdle={isIdle}
                          suspendConnection={suspendConnection}
                          client={client}
                        >
                          <SettingsPage
                            vendorId={designatedVendorId}
                            workspace={designatedWorkspace}
                            ourEmail={authorMe?.email}
                          />
                        </WsProvider>
                      </div>
                    )
                  }
                />
                <Route path="vendor/:vid/workspace/:wid/customers">
                  <Route
                    index={true}
                    element={
                      <div className="absolute inset-0 -mt-2 -mx-4 mb-0 overflow-visible">
                        {designatedVendorId && designatedWorkspaceId && (
                          <CustomersHome
                            vendorId={designatedVendorId}
                            workspaceId={designatedWorkspaceId}
                          />
                        )}
                      </div>
                    }
                  />

                  <Route
                    path=":cid"
                    element={
                      <div className="absolute inset-0 -mt-2 -mx-4 mb-0 overflow-visible">
                        {designatedVendorId && designatedWorkspaceId && (
                          <CustomersHome
                            vendorId={designatedVendorId}
                            workspaceId={designatedWorkspaceId}
                          />
                        )}
                      </div>
                    }
                  />
                </Route>
                <Route
                  path="vendor/:vid/workspace/:wid/analytics"
                  element={<>{designatedVendorId && designatedWorkspaceId && <AnalyticsPage />}</>}
                />
                <Route
                  path="vendor/:vid/workspace/:wid/chat/*"
                  element={
                    designatedVendorId && designatedWorkspaceId && agentToken ? (
                      <div className="absolute inset-0 -mt-2 -mx-4 mb-0 overflow-visible">
                        <WsProvider
                          token={agentToken}
                          workspaceId={designatedWorkspaceId}
                          isIdle={isIdle}
                          suspendConnection={suspendConnection}
                          client={client}
                        >
                          <AgentAppWrapper
                            isIdle={isIdle}
                            designatedVendorId={designatedVendorId}
                            billing={billing}
                            authorMe={authorMe}
                            openFromLocationHook={useOpenRoomFromBrowserLocation}
                            workspaceTags={workspaceTags}
                            workspaceIntegrations={workspaceIntegrations}
                            renderCustomerInfoPane={({
                              ourId,
                              helpdeskId,
                              activeRoomId,
                              openRosterClick,
                              rooms,
                              roomsLoading,
                              users,
                              usersLoading,
                              agents,
                              setShowIssueInfo,
                            }) => {
                              if (helpdeskId && designatedWorkspaceId && designatedVendorId) {
                                return (
                                  <CustomerInfoPane
                                    ourId={ourId}
                                    helpdeskId={helpdeskId}
                                    activeRoomId={activeRoomId}
                                    openRosterClick={openRosterClick}
                                    rooms={rooms}
                                    roomsLoading={roomsLoading}
                                    users={users}
                                    usersLoading={usersLoading}
                                    agents={agents}
                                    setShowIssueInfo={setShowIssueInfo}
                                    vendorId={designatedVendorId}
                                  />
                                );
                              }

                              return null;
                            }}
                            renderUsersInfoPane={({ room }) => {
                              if (designatedWorkspaceId && designatedVendorId) {
                                return <UsersInfoPane room={room} />;
                              }

                              return null;
                            }}
                          />
                          <GalleryModal />
                        </WsProvider>
                      </div>
                    ) : (
                      <></>
                    )
                  }
                >
                  <Route path="" element={<></>} />
                  <Route path=":roomId" element={<></>} />
                  <Route path=":roomId/:messageId" element={<></>} />
                </Route>
                <Route
                  path="vendor/:vid/team/*"
                  element={
                    designatedVendor !== undefined && workspaces !== undefined ? (
                      <div className="sm:ml-8">
                        <Link
                          className={classNames(
                            "sm:hidden z-20 absolute top-4 left-0 -mt-2 -ml-4 flex items-center gap-x-2 rounded-r p-2 bg-white fog:box-shadow-s transform transition-transform no-underline",
                            !designatedVendorId
                              ? "-translate-x-full"
                              : "translate-x-0 sm:-translate-x-full"
                          )}
                          to={"/admin"}
                        >
                          <Icons.ArrowBack />
                          <span className="fog:text-caption-l fog:text-link">Organizations</span>
                        </Link>
                        {designatedVendorId && ourRole && ["owner", "admin"].includes(ourRole) && (
                          <div
                            className={classNames("sm:mt-8", !onboardingChecklistDone && "mt-16")}
                          >
                            <OnboardingChecklist
                              onboardingChecklistDone={onboardingChecklistDone}
                              setOnboardingChecklistDone={setOnboardingChecklistDone}
                              vendorId={designatedVendorId}
                              workspacesCount={workspaces?.length || 0}
                              vendorIntegrations={vendorIntegrations}
                              onCreateWorkspace={() => {
                                navigate(`/admin/vendor/${designatedVendorId}/workspaces`);
                                setIsCreateWorkspaceModalOpen(true);
                              }}
                            />
                          </div>
                        )}
                        <div
                          className={classNames(
                            "sm:mt-8 flex flex-col gap-8",
                            onboardingChecklistDone && "mt-16"
                          )}
                        >
                          <WsProvider
                            token={agentToken}
                            workspaceId={designatedWorkspaceId}
                            isIdle={isIdle}
                            suspendConnection={suspendConnection}
                            client={client}
                          >
                            <Team vendor={designatedVendor} />
                          </WsProvider>
                        </div>
                      </div>
                    ) : (
                      <></>
                    )
                  }
                />
                <Route
                  path="vendor/:vid/billing/*"
                  element={
                    designatedVendor !== undefined && workspaces !== undefined ? (
                      <div className="sm:ml-8">
                        <Link
                          className={classNames(
                            "sm:hidden z-20 absolute top-4 left-0 -mt-2 -ml-4 flex items-center gap-x-2 rounded-r p-2 bg-white fog:box-shadow-s transform transition-transform no-underline",
                            !designatedVendorId
                              ? "-translate-x-full"
                              : "translate-x-0 sm:-translate-x-full"
                          )}
                          to={"/admin"}
                        >
                          <Icons.ArrowBack />
                          <span className="fog:text-caption-l fog:text-link">Organizations</span>
                        </Link>
                        <div className={classNames("sm:mt-8 flex flex-col gap-8 mt-16")}>
                          <Billing vendor={designatedVendor} countInViolation={countInViolation} />
                        </div>
                      </div>
                    ) : (
                      <></>
                    )
                  }
                />
              </Routes>
            </div>
          </div>
        </div>
      </div>

      {designatedVendor && (editWorkspace || isCreateWorkspaceModalOpen) && (
        <Modal
          onClose={() => {
            setEditWorkspace(undefined);
            setIsCreateWorkspaceModalOpen(false);
          }}
        >
          {editWorkspace ? (
            <UpdateWorkspaceForm
              workspace={editWorkspace}
              vendor={designatedVendor}
              nameOk={name => {
                return workspaces?.find(w => w.name === name) === undefined;
              }}
              onClose={() => {
                setEditWorkspace(undefined);
                setIsCreateWorkspaceModalOpen(false);
              }}
              onDeleteClick={() => {
                setEditWorkspace(undefined);
                setIsCreateWorkspaceModalOpen(false);
                setDeleteWorkspace(editWorkspace);
              }}
            />
          ) : (
            <CreateWorkspaceForm
              workspace={editWorkspace}
              vendor={designatedVendor}
              nameOk={name => {
                return workspaces?.find(w => w.name === name) === undefined;
              }}
              onClose={() => {
                setEditWorkspace(undefined);
                setIsCreateWorkspaceModalOpen(false);
              }}
            />
          )}
        </Modal>
      )}

      {designatedVendor && deleteWorkspace && (
        <DeleteWorkspace
          workspace={deleteWorkspace}
          vendorId={designatedVendor.id}
          onClose={() => setDeleteWorkspace(undefined)}
        />
      )}
    </div>
  );
};

const NotificationsPermissionBanner = ({
  notificationsPermission,
  setNotificationsPermission,
}: {
  notificationsPermission: NotificationPermission | "hide";
  setNotificationsPermission: (x: NotificationPermission | "hide") => void;
}) => {
  if (notificationsPermission === "default") {
    return (
      <div
        className="bg-red-100 border-red-400 text-red-700 px-4 py-3 relative text-center shadow"
        role="alert"
      >
        <span
          onClick={e => {
            e.preventDefault();

            window.Notification?.requestPermission().then(function (permission) {
              setNotificationsPermission(permission);
            });
          }}
          className="cursor-pointer"
        >
          {browser()?.name === "chrome" ? (
            <>
              <span className="block sm:inline font-medium">
                Fogbender needs your permission to enable{" "}
                <span className="underline">desktop notifications</span>
              </span>
            </>
          ) : (
            <>
              <strong className="font-bold">Click here</strong>{" "}
              <span className="block sm:inline font-medium">
                to enable <span className="underline">desktop notifications</span>
              </span>
            </>
          )}
        </span>
        <span
          className="absolute h-full mr-2 top-0 right-0 cursor-pointer flex"
          onClick={() => setNotificationsPermission("hide")}
        >
          <FontAwesomeTimes className="fa-fw self-center text-red-400 hover:text-red-600" />
        </span>
      </div>
    );
  } else {
    return null;
  }
};

const SubscriptionRequiredBanner = ({
  admins,
  ourRole,
  vendorId,
  countInViolation,
  billing,
}: {
  admins: Agent[];
  ourRole: AgentRole;
  vendorId: string;
  countInViolation: number;
  billing: VendorBilling;
}) => {
  const createCheckoutSessionMutation = useMutation({
    mutationFn: () => {
      return apiServer
        .url(`/api/vendors/${vendorId}/create-checkout-session`)
        .post({
          seats: countInViolation,
        })
        .json<{ url: string }>();
    },
    onSuccess: res => {
      const { url } = res;

      window.location.href = url;
    },
  });

  const commadAdmins = React.useMemo(() => {
    const res = [];

    if (admins.length === 1) {
      res.push(admins[0].email);
    } else if (admins.length === 2) {
      res.push(admins[0].email);
      res.push(" or ");
      res.push(admins[1].email);
    } else {
      admins.slice(0, -1).forEach(a => res.push(`${a.email}, `));
      res.push(` or ${admins.slice(-1)[0].email}`);
    }

    return res.join("");
  }, [admins]);

  if (billing.delinquent || countInViolation > 0) {
    return (
      <div
        className="bg-[rgb(32,86,143)] border-[rgb(32,86,143)] text-white px-4 py-3 relative text-center"
        role="alert"
      >
        <span className="block sm:inline font-medium">
          🧐 Please{" "}
          {billing.delinquent && billing.subscriptions.length > 0 ? (
            <Link to={`/admin/vendor/${vendorId}/billing`} className="hover:text-red-300 underline">
              update payment method
            </Link>
          ) : (
            <button
              className="hover:text-red-300 underline"
              onClick={() => {
                if (ourRole === "agent") {
                  alert(
                    `Only owners and admins can manage billing - your role is Agent. Please touch base with ${commadAdmins}`
                  );
                } else {
                  createCheckoutSessionMutation.mutate();
                }
              }}
            >
              subscribe
            </button>
          )}
          ,{" "}
          <Link className="hover:text-red-300" to={`/admin/-/team`}>
            downgrade to free tier
          </Link>
          , or{" "}
          <a
            className="hover:text-red-300"
            href="https://github.com/fogbender/fogbender"
            target="_blank"
          >
            host your own Fogbender <IconGithub className="ml-1 w-5 inline-block" />
          </a>
        </span>
      </div>
    );
  } else {
    return null;
  }
};

const Sidebar: React.FC<{
  hidden: boolean;
  vendorInvites: VendorInvite[] | undefined;
  vendorInviteCode: string | null;
  vendors: Vendor[] | undefined;
  designatedVendorId: string | undefined;
  teamMode: boolean | undefined;
  billingMode: boolean | undefined;
  billingStatus: string;
  ourRole: AgentRole | undefined;
}> = ({
  vendors,
  vendorInvites,
  vendorInviteCode,
  designatedVendorId,
  teamMode,
  billingMode,
  billingStatus,
  hidden,
  ourRole,
}) => {
  const hasVendors = vendors !== undefined && vendors.length > 0;
  const hasVendorInvites = vendorInvites !== undefined && vendorInvites.length > 0;

  const [isVisible, setIsVisible] = React.useState(false);
  const [editVendor, setEditVendor] = React.useState<Vendor>();
  const [deleteVendor, setDeleteVendor] = React.useState<Vendor>();

  const [isCreateVendorModalOpen, setIsCreateVendorModalOpen] = React.useState<boolean>();

  React.useEffect(() => {
    setIsVisible(!designatedVendorId);
  }, [designatedVendorId]);

  const sortedVendors = React.useMemo(
    () =>
      [...(vendors || [])]
        .filter(v => !v.deleted_at)
        .sort((a, b) => {
          if (a.updated_at < b.updated_at) {
            return 1;
          }
          if (a.updated_at > b.updated_at) {
            return -1;
          }
          return 0;
        }),
    [vendors]
  );

  return (
    <div
      className={classNames(
        "flex flex-col gap-8 sm:w-96 sm:box-content absolute z-10 sm:z-0 sm:static top-0 left-0 right-0 mt-4 bottom-0 pt-4 transform transition-transform sm:transform-none",
        isVisible ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 sm:opacity-100",
        hidden && "hidden"
      )}
    >
      {hasVendorInvites && (
        <div className="w-full bg-white p-4 rounded-xl flex flex-col">
          {hasVendorInvites && (
            <div className="text-gray-500 fog:text-caption-m uppercase">Pending invitations</div>
          )}

          {vendorInvites !== undefined && hasVendorInvites && (
            <div className="sm:w-full my-5 flex flex-col gap-4">
              {vendorInvites.map(v => (
                <div key={v.invite_id} className="flex flex-col py-1 border-t">
                  <div className="flex items-center justify-start pb-4 pt-2 pl-4">
                    <div className="fog:text-caption-xl">{v.vendor.name}</div>
                  </div>
                  <div className="flex items-center justify-between pb-2.5 mx-4">
                    <AcceptInviteButton invite={v} />
                    <DeclineInviteButton invite={v} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {vendorInvites?.length === 0 && vendorInviteCode && <BadInviteModal />}
        </div>
      )}
      <div className="w-full bg-white px-6 rounded-xl">
        {hasVendors && (
          <div className="text-gray-500 fog:text-caption-m py-4 gap-4 uppercase border-b">
            Organizations
          </div>
        )}

        {vendors !== undefined && (
          <div className="sm:w-full mt-5 flex flex-col gap-4">
            {sortedVendors
              .filter(v => v.status === undefined || v.status !== "archived")
              .map(v => (
                <div key={v.id} className="border-b border-gray-200 flex flex-col pb-2">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="fog:text-caption-xl">{v.name}</div>
                    <div
                      className="text-gray-500 hover:text-gray-800 cursor-pointer"
                      onClick={() => setEditVendor(v)}
                    >
                      <Icons.Gear />
                    </div>
                  </div>
                  <Link
                    className={classNames(
                      "flex border-l-5 border-brand-orange-500 rounded-r py-2.5 pl-2 fog:text-link no-underline fog:text-body-m",
                      v.id === designatedVendorId && !teamMode && !billingMode
                        ? "border-opacity-1"
                        : "border-opacity-0"
                    )}
                    to={`vendor/${v.id}/workspaces`}
                  >
                    <div className="flex-1">Workspaces</div>
                    <div className="pr-0.5">
                      <UnreadBadge vendorId={v.id} />
                    </div>
                  </Link>
                  <Link
                    className={classNames(
                      "border-l-5 border-brand-orange-500 rounded-r py-2.5 pl-2 fog:text-link no-underline fog:text-body-m",
                      v.id === designatedVendorId && teamMode
                        ? "border-opacity-1"
                        : "border-opacity-0"
                    )}
                    to={`vendor/${v.id}/team`}
                  >
                    Team
                  </Link>
                  {ourRole &&
                    ["owner", "admin"].includes(ourRole) &&
                    billingStatus === "success" && (
                      <Link
                        className={classNames(
                          "border-l-5 border-brand-orange-500 rounded-r py-2.5 pl-2 fog:text-link no-underline fog:text-body-m",
                          v.id === designatedVendorId && billingMode
                            ? "border-opacity-1"
                            : "border-opacity-0"
                        )}
                        to={`vendor/${v.id}/billing`}
                      >
                        Billing
                      </Link>
                    )}
                  <Link
                    className={classNames(
                      "flex border-l-5 border-brand-orange-500 border-opacity-0 rounded-r py-2.5 pl-2 fog:text-link no-underline fog:text-body-m"
                    )}
                    to={`vendor/${v.id}/support`}
                  >
                    <div className="flex-1">Fogbender support</div>
                    <div className="pr-2">
                      <HeadlessForSupport
                        vendorId={v.id}
                        hideFloatie={v.id !== designatedVendorId}
                      />
                    </div>
                  </Link>
                </div>
              ))}

            <div className="pt-1 pb-4">
              <ThinButton onClick={() => setIsCreateVendorModalOpen(true)}>
                Add organization
              </ThinButton>
            </div>
          </div>
        )}

        {deleteVendor && (
          <DeleteVendor vendor={deleteVendor} onClose={() => setDeleteVendor(undefined)} />
        )}

        {(isCreateVendorModalOpen || editVendor) && (
          <Modal
            onClose={() => {
              setEditVendor(undefined);
              setIsCreateVendorModalOpen(false);
            }}
          >
            {editVendor ? (
              <UpdateVendorForm
                vendor={editVendor}
                nameOk={name => {
                  return vendors?.find(v => v.name === name) === undefined;
                }}
                onClose={() => {
                  setEditVendor(undefined);
                  setIsCreateVendorModalOpen(false);
                }}
                onDeleteClick={() => {
                  setEditVendor(undefined);
                  setIsCreateVendorModalOpen(false);
                  setDeleteVendor(editVendor);
                }}
              />
            ) : (
              <CreateVendorForm
                nameOk={name => {
                  return vendors?.find(v => v.name === name) === undefined;
                }}
                onClose={() => {
                  setEditVendor(undefined);
                  setIsCreateVendorModalOpen(false);
                }}
              />
            )}
          </Modal>
        )}
      </div>
    </div>
  );
};

type ExtractProps<Props> = Props extends React.FC<infer TProps> ? TProps : never;

type AgentAppProps = ExtractProps<typeof AgentApp>;
const AgentAppWrapper: React.FC<
  AgentAppProps & { designatedVendorId: string; billing?: VendorBilling }
> = ({ designatedVendorId, billing, ...props }) => {
  const { data: agents } = useQuery({
    queryKey: queryKeys.agents(designatedVendorId),
    queryFn: () => apiServer.get(`/api/vendors/${designatedVendorId}/agents`).json<Agent[]>(),
  });
  return <AgentApp agents={agents} billing={billing} {...props} />;
};

const AdminSupport: React.FC<{
  vendors: Vendor[] | undefined;
}> = ({ vendors }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    if (vendors?.length === 1) {
      navigate(`/admin/vendor/${vendors[0].id}/support`);
    }
  }, [vendors, navigate]);

  if (vendors !== undefined) {
    return (
      <div>
        <div className="mb-8 place-content-center flex fog:text-caption-xl">
          To continue, please select an organization:
        </div>
        <div className="mb-8">
          {vendors &&
            vendors
              .filter(v => v.status === undefined || v.status !== "archived")
              .map(v => (
                <Link
                  key={v.id}
                  className="flex items-start fog:text-header3 fog:text-link no-underline cursor-pointer"
                  to={`/admin/vendor/${v.id}/support`}
                >
                  <div className="mb-8 place-content-center py-4 px-5 flex rounded-xl fog:box-shadow">
                    <div className="pb-2 flex-1 truncate">{v.name} Support</div>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    );
  }
  return <div>Loading...</div>;
};

const AdminIntegrationsRedirect = () => {
  const { integration } = useParams<"integration">();
  return <Navigate to={`/admin/-/-/settings?add_integration=${integration}`} />;
};

const AdminRedirect: React.FC<{
  vendors: Vendor[] | undefined;
}> = ({ vendors }) => {
  const { "*": rest } = useParams<"*">();
  const searchString = useSearchParams()[0].toString();
  const search = searchString ? "?" + searchString : "";
  const navigate = useNavigate();
  const { hash } = useLocation();

  React.useEffect(() => {
    if (vendors?.length === 1) {
      navigate(`/admin/vendor/${vendors[0].id}/${rest}${search}${hash}`);
    }
  }, [vendors, navigate, rest, search, hash]);

  if (vendors !== undefined) {
    return (
      <div className="relative sm:ml-8 pt-10 sm:pt-0">
        <div className="my-8 place-content-center flex fog:text-caption-xl">
          To continue, please select an organization:
        </div>
        <div className="mb-8 flex flex-col gap-6">
          {vendors &&
            vendors
              .filter(v => v.status === undefined || v.status !== "archived")
              .map(v => (
                <Link
                  key={v.id}
                  className="flex items-start fog:text-header3 fog:text-link no-underline cursor-pointer py-4 px-5 bg-white rounded-xl fog:box-shadow"
                  to={`/admin/vendor/${v.id}/${rest}${search}${hash}`}
                >
                  <div className="flex-1 truncate">{v.name}</div>
                </Link>
              ))}
        </div>
      </div>
    );
  }
  return <div>Loading...</div>;
};

const AdminVendorRedirect: React.FC<{
  vendors: Vendor[] | undefined;
  workspaces: Workspace[] | undefined;
  onCreateWorkspace: () => void;
}> = ({ workspaces, vendors, onCreateWorkspace }) => {
  const { "*": rest, vid: vendorId } = useParams<"*" | "vid">();
  const { hash } = useLocation();
  const searchString = useSearchParams()[0].toString();
  const search = searchString ? "?" + searchString : "";
  const navigate = useNavigate();

  const vendor = (vendors || []).find(v => v.id === vendorId);

  React.useEffect(() => {
    if (workspaces?.length === 1) {
      navigate(`/admin/vendor/${vendorId}/workspace/${workspaces[0].id}/${rest}${search}${hash}`);
    }
  }, [workspaces, navigate, rest, vendorId, search, hash]);

  if (workspaces !== undefined) {
    return (
      <div className="relative sm:ml-8 pt-10">
        <div className="mb-8 place-content-center flex fog:text-caption-xl">
          To continue, please select a workspace:
        </div>
        {workspaces?.length === 0 && (
          <div className="mb-8 place-content-center flex gap-1 fog:text-caption-xl">
            No workspaces found.{" "}
            <div>
              <Link
                to={`/admin/vendor/${vendorId}/workspaces`}
                className="fog:text-link"
                onClick={e => {
                  e.preventDefault();
                  onCreateWorkspace();
                }}
              >
                Create a workspace
              </Link>
            </div>
          </div>
        )}
        <div className="mb-8 flex flex-col gap-6">
          {workspaces &&
            workspaces.map(w => (
              <Link
                key={w.id}
                className="flex items-start fog:text-header3 fog:text-link no-underline cursor-pointer py-4 px-5 bg-white rounded-xl fog:box-shadow"
                to={{
                  pathname: `/admin/vendor/${vendorId}/workspace/${w.id}/${rest}`,
                  search,
                  hash,
                }}
              >
                <div className="flex-1 truncate">
                  {vendor?.name} / {w.name}{" "}
                  {w.description && <span className="text-sm">({w.description})</span>}
                </div>
              </Link>
            ))}
        </div>
      </div>
    );
  }
  return <div>Loading...</div>;
};

const Breadcrumbs: React.FC<{
  designatedVendorId: string | undefined;
  designatedVendor: Vendor | undefined;
  designatedWorkspaceId: string | undefined;
  designatedWorkspace: Workspace | undefined;
  settingsMode: boolean | undefined;
  customersMode: boolean | undefined;
  supportMode: boolean | undefined;
  analyticsMode?: boolean;
  isAgentApp: boolean;
}> = ({
  designatedVendorId,
  designatedVendor,
  designatedWorkspaceId,
  designatedWorkspace,
  settingsMode,
  customersMode,
  supportMode,
  analyticsMode,
  isAgentApp,
}) => {
  const homeLink = designatedVendor ? `./vendor/${designatedVendor.id}/workspaces` : "./";
  const workspaceLink = designatedVendor
    ? designatedWorkspace
      ? `./vendor/${designatedVendor.id}/workspace/${designatedWorkspace.id}`
      : `./vendor/${designatedVendor.id}/workspaces`
    : `./`;

  const supportUrl = useFullScreenClientUrl(designatedVendor?.id);
  const excludeWorkspaceId = isAgentApp ? designatedWorkspace?.id : undefined;

  const cachedVendorName = useDesignatedVendorNameCache(designatedVendorId, designatedVendor?.name);
  const cachedWorkspaceName = useDesignatedWorkspaceNameCache(
    designatedWorkspaceId,
    designatedWorkspace?.name
  );

  return (
    <div className="flex items-center gap-5 h-full truncate">
      <Routes>
        <Route
          path="vendor/:vid/team/*"
          element={<Title>Fogbender | {cachedVendorName} | Team</Title>}
        />
        <Route
          path="vendor/:vid/workspaces/*"
          element={<Title>Fogbender | {cachedVendorName} | Workspaces</Title>}
        />
        <Route
          path="vendor/:vid/support/*"
          element={<Title>Fogbender | {cachedVendorName} | Fogbender support</Title>}
        />
        <Route
          path="vendor/:vid/workspace/:wid/settings/*"
          element={
            <Title>
              Fogbender | {cachedVendorName} / {cachedWorkspaceName} | Settings
            </Title>
          }
        />
        <Route
          path="vendor/:vid/workspace/:wid/settings/embed/*"
          element={
            <Title>
              Fogbender | {cachedVendorName} / {cachedWorkspaceName} | Instructions
            </Title>
          }
        />
        <Route
          path="vendor/:vid/workspace/:wid/customers/*"
          element={
            <Title>
              Fogbender | {cachedVendorName} / {cachedWorkspaceName} | Customers
            </Title>
          }
        />
        <Route
          path="vendor/:vid/workspace/:wid/chat/*"
          element={
            <Title>
              Fogbender | {cachedVendorName} / {cachedWorkspaceName} | Chat
            </Title>
          }
        />
        <Route path="*" element={<Title>Fogbender | Dashboard</Title>} />
      </Routes>
      <Link to={homeLink} className="relative w-8 h-8">
        <img className="w-full h-full" src={logo} alt="" />
        <div
          className={classNames(
            "absolute top-0 right-0 -mt-1.5 -mr-2.5",
            designatedWorkspace === undefined && !supportMode ? "hidden" : "block sm:hidden"
          )}
        >
          <UnreadBadge />
        </div>
      </Link>
      <Link
        to={homeLink}
        className={classNames(
          `relative items-center
            h-full cursor-pointer`,
          "mr-2.5 pt-4 pb-3 border-b-5 border-brand-orange-500 no-underline",
          designatedWorkspace === undefined && !supportMode
            ? "border-opacity-1"
            : "border-opacity-0 fog:text-link hidden sm:flex"
        )}
      >
        <div className="flex h-full items-center gap-1.5">
          <Icons.HomeRectangle />
          <span className="uppercase font-semibold text-base">Home</span>
        </div>
        <div className="absolute top-0 right-0 mt-2.5 -mr-2.5">
          <UnreadBadge excludeWorkspaceId={excludeWorkspaceId} />
        </div>
      </Link>
      {designatedVendor && (designatedWorkspace || supportMode) && (
        <>
          <div className="hidden sm:flex h-full items-center -ml-2.5 pt-4 pb-3 border-b-5 border-brand-orange-500 border-opacity-0">
            <Icons.RightNavArrow />
          </div>
          <Link
            to={workspaceLink + "/chat"}
            className={classNames(
              "flex flex-1 h-full items-center",
              "pt-4 pb-3 border-b-5 border-brand-orange-500",
              "no-underline cursor-default truncate",
              (settingsMode || customersMode || analyticsMode) &&
                "border-opacity-0 cursor-pointer fog:text-link"
            )}
          >
            <span className="truncate">{designatedVendor.name}</span>

            <span className="px-2">/</span>

            <span className="truncate">{designatedWorkspace?.name || "Fogbender support"}</span>
          </Link>
          {!supportMode && (
            <Link
              to={workspaceLink + "/settings"}
              className={classNames(
                "hidden sm:flex h-full items-center",
                "pt-4 pb-3 border-b-5 border-brand-orange-500",
                "no-underline cursor-default",
                !settingsMode && "border-opacity-0 cursor-pointer fog:text-link"
              )}
            >
              <span>Settings</span>
            </Link>
          )}
          {!supportMode && (
            <Link
              to={workspaceLink + "/customers"}
              className={classNames(
                "hidden sm:flex h-full items-center",
                "pt-4 pb-3 border-b-5 border-brand-orange-500",
                "no-underline cursor-default",
                !customersMode && "border-opacity-0 cursor-pointer fog:text-link"
              )}
            >
              <span>Customers</span>
            </Link>
          )}
          {/* TODO: remove analyticsMode check once we want to show analytics link */}
          {!supportMode && analyticsMode && (
            <Link
              to={workspaceLink + "/analytics"}
              className={classNames(
                "hidden sm:flex h-full items-center",
                "pt-4 pb-3 border-b-5 border-brand-orange-500",
                "no-underline cursor-default",
                !analyticsMode && "border-opacity-0 cursor-pointer fog:text-link"
              )}
            >
              <span>Analytics</span>
            </Link>
          )}
          {!supportMode && supportUrl && (
            <a
              href={supportUrl}
              target={`_fogbender_${designatedVendor.id}`}
              className={classNames(
                "hidden sm:flex h-full items-center",
                "pt-4 pb-3 border-b-5 border-brand-orange-500",
                "no-underline cursor-default",
                true && "border-opacity-0 cursor-pointer fog:text-link"
              )}
            >
              <span>Support</span>
              <div className="ml-1">
                <HeadlessForSupport vendorId={designatedVendor.id} hideFloatie={isAgentApp} />
              </div>
            </a>
          )}
        </>
      )}
    </div>
  );
};

const UserMenu: React.FC<{
  isIdle: boolean;
  suspendConnection: boolean;
  setSuspendConnection: (suspend: boolean) => void;
}> = ({ isIdle, suspendConnection, setSuspendConnection }) => {
  const userName = useSelector(selectUserName);
  const userImageUrl = useSelector(selectUserImageUrl);
  const [logout] = useLogout();
  useCheckCurrentSession({ skip: false });
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [devMode, setDevMode] = React.useState(false);

  // React.useEffect(() => {
  //   if (lightDarkMode === "dark") {
  //     document.documentElement.classList.add("dark");
  //   } else {
  //     document.documentElement.classList.remove("dark");
  //   }
  // }, [lightDarkMode]);

  const [muteSound, setMuteSound] = useAtom(muteSoundAtom);
  const [muteNotifications, setMuteNotifications] = useAtom(muteNotificationsAtom);
  const [showFocusedRoster, setShowFocusedRoster] = useAtom(showFocusedRosterAtom);
  const [showOutlookRoster, setShowOutlookRoster] = useAtom(showOutlookRosterAtom);

  return (
    <div className="flex justify-end relative ml-5 cursor-pointer gap-2">
      {!!import.meta.env.SITE && (
        <div className="max-h-min self-center">{<NewVersionChecker />}</div>
      )}
      <div
        className="flex max-w-max items-center gap-2 fog:text-link"
        onClick={e => {
          setDevMode(e.ctrlKey || e.metaKey);
          setIsMenuOpen(!isMenuOpen);
        }}
      >
        <span
          className={classNames(
            "hidden md:inline-block text-sm truncate",
            isIdle && "text-gray-700"
          )}
        >
          {userName}
        </span>
        <div className={classNames(isIdle && "opacity-80")}>
          <Avatar url={userImageUrl} name={userName} />
        </div>
      </div>
      <div
        id="user-menu"
        className={classNames(
          "bg-white border rounded-xl fog:text-body-m fog:box-shadow-m absolute mt-10 top-0 right-0 overflow-auto z-30",
          !isMenuOpen && "invisible"
        )}
      >
        <div className="fixed inset-0" onClick={() => setIsMenuOpen(false)} />
        <ul className="relative z-10">
          {devMode && (
            <>
              <AgentMenuLink
                to="/admin/config"
                onClick={() => {
                  setIsMenuOpen(false);
                }}
              >
                Preferences
              </AgentMenuLink>
              <FancyMenuItem
                onClick={() => {
                  setIsMenuOpen(false);
                  setSuspendConnection(!suspendConnection);
                }}
                text={suspendConnection ? "Resume connection" : "Suspend connection"}
                icon={null}
              />
            </>
          )}
          <FancyMenuItem
            onClick={() => setShowFocusedRoster(x => !x)}
            text="Focused roster"
            icon={
              !showFocusedRoster ? <SwitchOff className="w-10" /> : <SwitchOn className="w-10" />
            }
          />
          <FancyMenuItem
            onClick={() => setShowOutlookRoster(x => !x)}
            text="Expanded roster"
            icon={
              !showOutlookRoster ? <SwitchOff className="w-10" /> : <SwitchOn className="w-10" />
            }
          />
          <FancyMenuItem
            onClick={() => setMuteNotifications(x => !x)}
            text="Desktop notifications"
            icon={
              muteNotifications ? <SwitchOff className="w-10" /> : <SwitchOn className="w-10" />
            }
          />
          <FancyMenuItem
            onClick={() => setMuteSound(x => !x)}
            text="Play sound"
            icon={muteSound ? <SwitchOff className="w-10" /> : <SwitchOn className="w-10" />}
          />
          <FancyMenuItem
            onClick={async () => {
              await logout();
              setIsMenuOpen(false);
              requestAnimationFrame(() => {
                window.location.reload();
              });
            }}
            text="Log out"
            icon={<Logout />}
          />
        </ul>
      </div>
    </div>
  );
};

const AgentMenuLink = (props: { onClick: () => void; to: string; children: React.ReactNode }) => {
  const { onClick, to, children } = props;
  return (
    <li className="p-2 block text-gray-900 hover:text-brand-red-500 no-underline">
      <Link
        to={to}
        className="no-underline hover:no-underline flex w-full text-left gap-4 px-2 items-center"
        onClick={onClick}
      >
        {children}
      </Link>
    </li>
  );
};

const NewVersionChecker = React.memo(() => {
  const oldVersion = window._fog_version;
  const versionQuery = useQuery({
    queryKey: "version",
    queryFn: () => wretch("/ssg/version.json").get().json<{ version: string }>(),
    initialData: { version: oldVersion },
    // check every 3 hours
    staleTime: 1000 * 60 * 60 * 3,
  });
  const newVersion = versionQuery.data?.version;

  if (newVersion !== oldVersion) {
    return (
      <button
        title={`New version available: ${oldVersion} -> ${newVersion}`}
        className="bg-brand-red-500 text-white text-xs px-2 py-1 rounded-full hover:text-yellow-100 hover:bg-purple-500"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
          window.location.reload();
        }}
      >
        <span className="sm:hidden lg:inline">New version available</span>
        <span className="hidden sm:inline lg:hidden max-w-fit">New</span>
      </button>
    );
  } else {
    return null;
  }
});

const DeleteWorkspace: React.FC<{
  workspace: Workspace;
  vendorId: string;
  onClose: () => void;
}> = ({ workspace, vendorId, onClose }) => {
  const [error, setError] = React.useState<string>();
  const deleteWorkspaceMutation = useMutation(
    () => {
      return fetch(`${getServerUrl()}/api/vendors/${vendorId}/workspaces/${workspace.id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    {
      onSuccess: async (r, _params) => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.workspaces(vendorId));
          onClose();
        } else {
          const res = await r.json();
          const { error } = res;
          setError(error);
        }
      },
    }
  );

  return (
    <ConfirmDialog
      title="Delete this workspace?"
      buttonTitle="Delete"
      onClose={onClose}
      onDelete={() => deleteWorkspaceMutation.mutate()}
      loading={deleteWorkspaceMutation.isLoading}
      error={error}
    >
      <div className="flex flex-col gap-y-4">
        <div className="fog:text-header3">{workspace.name}</div>
        {workspace.description && <div className="fog:text-body-m">{workspace.description}</div>}
        <div className="text-brand-red-500">
          <span className="px-0.5 bg-yellow-300 text-gray-900">NOTE:</span> This operation cannot be
          undone
        </div>
      </div>
    </ConfirmDialog>
  );
};

const DeleteVendor: React.FC<{
  vendor: Vendor;
  onClose: () => void;
}> = ({ vendor, onClose }) => {
  const [error, setError] = React.useState<string>();
  const deleteVendorMutation = useMutation(
    () => {
      return fetch(`${getServerUrl()}/api/vendors/${vendor.id}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    {
      onSuccess: async (r, _params) => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.vendors());
          queryClient.invalidateQueries(queryKeys.workspaces(vendor.id));
          onClose();
        } else {
          const res = await r.json();
          const { error } = res;
          setError(error);
        }
      },
    }
  );

  return (
    <ConfirmDialog
      title="Delete this organization?"
      buttonTitle="Delete"
      onClose={onClose}
      onDelete={() => deleteVendorMutation.mutate()}
      loading={deleteVendorMutation.isLoading}
      error={error}
    >
      <div className="flex flex-col gap-y-4">
        <div className="fog:text-header3">{vendor.name}</div>
        <div className="text-brand-red-500">
          <span className="px-0.5 bg-yellow-300 text-gray-900">NOTE:</span> This operation cannot be
          undone
        </div>
      </div>
    </ConfirmDialog>
  );
};

export const AdminWithProviders = () => {
  return (
    <IsIdleProvider>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          <Admin />
        </JotaiProvider>
      </QueryClientProvider>
    </IsIdleProvider>
  );
};
