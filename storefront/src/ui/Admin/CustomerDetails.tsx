import classNames from "classnames";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  type CrmData,
  type Customer,
  type CustomerCrm,
  Icons,
  isExternalHelpdesk,
  ThickButton,
  ThinButton,
  useInputWithError,
} from "fogbender-client/src/shared";
import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import { Clipboard } from "fogbender-client/src/shared/components/Icons";
import { SelectSearch } from "fogbender-client/src/shared/ui/SelectSearch";
import React from "react";
import { useMutation, useQuery } from "react-query";
import { Link } from "react-router-dom";

import { getServerUrl } from "../../config";
import { queryClient, queryKeys } from "../client";

import { type MergeLink } from "./MergeLink";

dayjs.extend(relativeTime);

export const CustomerDetails: React.FC<{
  customer: Customer;
  workspaceId: string;
  vendorId: string;
  lookupCustomerById: (x: string) => Customer | undefined;
}> = ({ customer, workspaceId, vendorId, lookupCustomerById }) => {
  const {
    data: customerCrms,
    status: customerCrmStatus,
    isRefetching: isRefetchingCustomer,
  } = useQuery<Customer>(
    queryKeys.customer(customer.id),
    () =>
      fetch(`${getServerUrl()}/api/helpdesks/${customer.helpdeskId}`, {
        credentials: "include",
      }).then(res => res.json()),
    { enabled: customer !== undefined && customer.helpdeskId !== undefined }
  );

  const { data: mergeLinks } = useQuery<MergeLink[]>(queryKeys.crmConnections(workspaceId), () =>
    fetch(`${getServerUrl()}/api/workspaces/${workspaceId}/merge-links`, {
      credentials: "include",
    }).then(res => {
      if (res.status === 200) {
        return res.json();
      } else {
        return {
          data: [],
        };
      }
    })
  );

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col justify-between space-y-6 lg:space-y-0 lg:flex-row lg:space-x-6">
        <CustomerInfo customer={customer} />
        <DomainsInfo
          vendorId={vendorId}
          workspaceId={workspaceId}
          customer={customer}
          lookupCustomerById={lookupCustomerById}
        />
      </div>

      <div className="flex flex-col gap-6">
        {isExternalHelpdesk(customer.name) !== true && (mergeLinks || []).length > 0 && (
          <div className="basis-2/5 rounded-lg">
            <h3 className="fog:text-header3 text-2xl mb-4">
              CRM account assignments for {customer.name}
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col h-full">
                <div className="fog:text-caption-l flex space-x-2">
                  <div className="basis-1/3">Account</div>
                  <div className="basis-2/3">Existing Assignment</div>
                </div>
                <hr className="mt-2" />
                {(mergeLinks || []).concat().map(x => (
                  <CrmLink
                    workspaceId={workspaceId}
                    customer={customer}
                    link={x}
                    key={`${customer.id} ${x.id}`} // here we are creating key using customer.id because we want the CrmLink to create new instance whenever customer is changed
                    lookupCustomerById={lookupCustomerById}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {customerCrms?.crmData?.length && (
        <div className={classNames("h-8", isRefetchingCustomer ? "visible" : "invisible")}>
          <div className="flex justify-center gap-2">
            <span className="text-green-600">Syncing CRM records...</span>
            <Icons.Spinner className="w-4 text-blue-500" />
          </div>
        </div>
      )}

      {customerCrmStatus === "success" && customerCrms?.crmData?.length && (
        <div>
          <h3 className="fog:text-header3 mb-4">Linked CRM Data</h3>
          {customerCrms.crmData.map((crmData, i) => (
            <div className="space-y-4" key={i}>
              <CustomerCrmData crmData={crmData} mergeLinks={mergeLinks} key={i} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomerCrmData = ({
  crmData,
  mergeLinks,
}: {
  crmData: CrmData;
  mergeLinks?: MergeLink[];
}) => {
  const { crm, data } = crmData;
  const mergeLink = (mergeLinks || []).find(l => l.remote_id === crm.crmRemoteId);
  const { addresses, description, industry, name, number_of_employees, phone_numbers, website } =
    data;

  if (!mergeLink) {
    return null;
  }

  const { integration, remote_id } = mergeLink;

  const infoClassName = "fog:text-body-m";

  return (
    <div className="border border-gray-200 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-5">
        <img
          alt={`${integration.name} logo`}
          className="h-12 w-12"
          src={integration.square_image}
        />
        <div>
          <div className="fog:text-caption-xl mb-1">{integration.name}</div>
          <div className="text-gray-500 fog:text-body-s">{remote_id}</div>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-4">
        <div className="basis-1/2 space-y-2">
          <CustomerInfoWrapper label="Domain Name">
            <span className={infoClassName}>
              <a className="fog:text-link" href={website} target="_blank" rel="noopener noreferrer">
                {name}
              </a>
            </span>
          </CustomerInfoWrapper>
          <div>
            {website && (
              <CustomerInfoWrapper label="Website URL">
                <span className={infoClassName}>
                  <a
                    className="fog:text-link"
                    href={`https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {website}
                  </a>
                </span>
              </CustomerInfoWrapper>
            )}
          </div>
          <CustomerInfoWrapper label="Address">
            <span className={infoClassName}>
              {addresses.length
                ? addresses.map((address, i) => (
                    <span className="block" key={i}>
                      {address}
                    </span>
                  ))
                : "Not Found"}
            </span>
          </CustomerInfoWrapper>
          <CustomerInfoWrapper label="Phone Number">
            <span className={infoClassName}>
              {phone_numbers.length
                ? phone_numbers
                    .map(phoneNumberData => {
                      const { phone_number } = phoneNumberData;
                      return phone_number;
                    })
                    .join(",")
                : "Not Found"}
            </span>
          </CustomerInfoWrapper>
        </div>
        <div className="basis-1/2 flex flex-col space-y-2">
          <CustomerInfoWrapper label="Employees">
            <span className={infoClassName}>{number_of_employees}</span>
          </CustomerInfoWrapper>
          <CustomerInfoWrapper label="Description">
            <span className={infoClassName}>{description}</span>
          </CustomerInfoWrapper>
          <CustomerInfoWrapper label="Industry">
            <span className={classNames(infoClassName, "break-all")}>{industry}</span>
          </CustomerInfoWrapper>
        </div>
      </div>
    </div>
  );
};

const CustomerInfoWrapper = ({
  children,
  label,
}: {
  children?: React.ReactNode;
  label: string;
}) => {
  return (
    <div className="grid grid-cols-[120px_auto] gap-x-6">
      <span className="fog:text-caption-l">{label}</span>
      {children}
    </div>
  );
};

const DomainsInfo = ({
  vendorId,
  workspaceId,
  customer,
  lookupCustomerById,
}: {
  vendorId: string;
  workspaceId: string;
  customer: Customer;
  lookupCustomerById: (x: string) => Customer | undefined;
}) => {
  const addDomainToCustomerMutation = useMutation(
    (params: { customerId: string; domain: string }) => {
      const { customerId, domain } = params;

      return fetch(`${getServerUrl()}/api/customers/${customerId}/add-domain`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ domain }),
      });
    },
    {
      onSuccess: async (r, params) => {
        if (r.status === 204) {
          const { customerId } = params;
          resetNewDomain();
          queryClient.invalidateQueries(queryKeys.customers(workspaceId));
          queryClient.invalidateQueries(queryKeys.customer(customerId));
        } else if (r.status === 400) {
          const { error: err } = await r.json();

          if (err === "domain_taken") {
            setNewDomainError("This domain is already in use");
          }
        }
      },
    }
  );

  const removeDomainFromCustomerMutation = useMutation(
    (params: { customerId: string; domain: string }) => {
      const { customerId, domain } = params;

      return fetch(`${getServerUrl()}/api/customers/${customerId}/remove-domain`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ domain }),
      });
    },
    {
      onSuccess: async (r, params) => {
        const { customerId } = params;

        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.customers(workspaceId));
          queryClient.invalidateQueries(queryKeys.customer(customerId));
        }
      },
    }
  );

  const [newDomainError, setNewDomainError] = React.useState<string>();

  const [newDomain, newDomainInput, resetNewDomain] = useInputWithError({
    title: "Add a domain",
    error: newDomainError,
  });

  React.useEffect(() => {
    resetNewDomain();
  }, [customer, resetNewDomain]);

  React.useEffect(() => {
    setNewDomainError(undefined);
  }, [newDomain]);

  const customersAlsoUsingDomains = (customer.domains || [])
    .map(domain => {
      return {
        domain,
        customers: (customer.domainMatches || [])
          .map(customerId => lookupCustomerById(customerId))
          .filter(c => c?.id !== customer.id && (c?.domains || []).includes(domain)),
      };
    })
    .filter(c => c.customers.length > 0);

  return isExternalHelpdesk(customer.name) !== true ? (
    <div className="border text-sm rounded-xl p-4">
      {customer.domains !== undefined && customer.domains.length > 0 && (
        <div className="flex mb-4 gap-2">
          <div className="flex gap-2 flex-wrap">
            {customer.domains.map((domain, i) => (
              <Tags
                clipboard={true}
                key={i}
                text={domain}
                onCloseClick={() => {
                  removeDomainFromCustomerMutation.mutate({
                    customerId: customer.id,
                    domain,
                  });
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-col space-y-4">
        <p className="max-w-2xl">
          Users that have access to email accounts associated with domains listed here will be able
          to enter this customer’s helpdesk via{" "}
          <a className="fog:text-link" href="/blog/unknown-user-widget" target="_blank">
            Unknown User Widget
          </a>
          .
          {/* TODO: if a domain points to multiple helpdesks, we need to:
              a) offer unknown user a choice
              b) offer auto-join OFF option to vendor
            */}
        </p>
        <form
          className="flex gap-2 items-center"
          onSubmit={e => {
            e.preventDefault();
            addDomainToCustomerMutation.mutate({
              customerId: customer.id,
              domain: newDomain,
            });
          }}
        >
          <div className="w-72">{newDomainInput}</div>
          {!!newDomain.length && <ThickButton>Add</ThickButton>}
        </form>
      </div>
      {(customersAlsoUsingDomains || []).length > 0 && (
        <div className="flex flex-col gap-2">
          Domain conflicts with other customers:
          {customersAlsoUsingDomains.map(x => (
            <div className="flex gap-2" key={x.domain}>
              <span className="basis-44">
                <Tags text={x.domain} clipboard={true} />
              </span>
              <span className="">
                <div className="flex">
                  {x.customers.map((q, i) => {
                    const c = q as Customer; // XXX x is never undefined, but TS thinks it can be
                    return (
                      <>
                        <Link
                          key={c.id}
                          to={`/admin/vendor/${vendorId}/workspace/${workspaceId}/customers/${c.id}`}
                          className="fog:text-chat-username-m fog:text-link no-underline cursor-pointer"
                        >
                          {c.name}
                        </Link>
                        {i < x.customers.length - 1 && <span className="mr-1">,</span>}
                      </>
                    );
                  })}
                </div>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : null;
};

const CustomerInfoLabel = ({
  bold,
  clipboard,
  title,
}: {
  bold?: boolean;
  clipboard?: boolean;
  title: string;
}) => {
  return (
    <div className="flex gap-x-4 items-center">
      <span className={classNames(bold && "font-semibold")}>{title}</span>
      {clipboard && (
        <ClipboardCopy text={title}>
          <Clipboard />
        </ClipboardCopy>
      )}
    </div>
  );
};

const CustomerInfo = ({ customer }: { customer: Customer }) => {
  return (
    <div className="flex fog:text-body-m space-x-6">
      <div className="flex flex-col flex-shrink-0 gap-1">
        <CustomerInfoLabel title="ID" bold={true} />
        <CustomerInfoLabel title="Helpdesk ID" bold={true} />
        {customer.externalUid && (
          <>
            <CustomerInfoLabel title="External ID" bold={true} />
            <CustomerInfoLabel title="Added" bold={true} />
          </>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <CustomerInfoLabel title={customer.id} />
        <CustomerInfoLabel title={customer.helpdeskId} />
        {customer.externalUid && (
          <>
            <CustomerInfoLabel title={customer.externalUid} />
            <CustomerInfoLabel title={dayjs(customer.insertedAt / 1000).fromNow()} />
          </>
        )}
      </div>
    </div>
  );
};

export const Tags: React.FC<{
  text: string;
  onCloseClick?: () => void;
  clipboard?: boolean;
}> = ({ clipboard, text, onCloseClick }) => {
  return (
    <div
      className={classNames(
        "flex items-center gap-x-1 pl-2 pr-1 py-0.5 rounded-md border fog:text-chat-username-m",
        "border-blue-200 bg-blue-50",
        "max-w-min",
        "dark:bg-black"
      )}
    >
      <span className="whitespace-nowrap flex gap-1 items-center">
        {text}
        {clipboard && (
          <ClipboardCopy text={text}>
            <Clipboard />
          </ClipboardCopy>
        )}
      </span>
      {onCloseClick && (
        <span className="cursor-pointer hover:text-brand-red-500" onClick={onCloseClick}>
          <Icons.XClose className="w-4" />
        </span>
      )}
    </div>
  );
};

type Account = {
  id: string;
  remote_id: string;
  name: string;
  website: string;
};

const CrmLink: React.FC<{
  workspaceId: string;
  customer: Customer;
  link: MergeLink;
  lookupCustomerById: (x: string) => Customer | undefined;
}> = ({ workspaceId, customer, link, lookupCustomerById }) => {
  const { data: accounts } = useQuery<Account[]>(
    queryKeys.crmLinkAccounts(workspaceId, link.end_user_origin_id),
    () =>
      fetch(
        `${getServerUrl()}/api/workspaces/${workspaceId}/merge-links/${
          link.end_user_origin_id
        }/accounts`,
        {
          credentials: "include",
        }
      ).then(res => {
        if (res.status === 200) {
          return res.json();
        } else {
          return [];
        }
      })
  );

  const [selectedAccount, setSelectedAccount] = React.useState<(typeof options)[number]>();

  const [accountsSearch, setAccountsSearch] = React.useState<string>();

  const [conflictCustomerName, setConflictCustomerName] = React.useState<string>();

  const options = React.useMemo(() => {
    let accountsOptions = (accounts || []).map(account => {
      return {
        option: `${account.name} (${account.remote_id})`,
        value: JSON.stringify({ remoteAccountId: account.remote_id, accountId: account.id }),
      };
    });

    if (accountsSearch?.length) {
      accountsOptions = accountsOptions.filter(account =>
        account.option
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(accountsSearch.toLowerCase().replace(/\s+/g, ""))
      );
    }

    return accountsOptions;
  }, [accountsSearch, accounts]);

  const assignMutation = useMutation(
    (params: { crmRemoteAccountId: string; crmAccountId: string; assign?: boolean }) => {
      const { crmRemoteAccountId, crmAccountId, assign } = params;

      setConflictCustomerName(undefined);

      if (assign) {
        return fetch(
          `${getServerUrl()}/api/workspaces/${workspaceId}/merge-links/${
            link.end_user_origin_id
          }/assign-customer-to-crm-account`,
          {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ crmRemoteAccountId, crmAccountId, customerId: customer.id }),
          }
        );
      } else {
        return fetch(
          `${getServerUrl()}/api/workspaces/${workspaceId}/merge-links/${
            link.end_user_origin_id
          }/unassign-customer-from-crm-account`,
          {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ crmRemoteAccountId, crmAccountId, customerId: customer.id }),
          }
        );
      }
    },
    {
      onSuccess: async (r, params) => {
        const { crmAccountId } = params;

        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.customers(workspaceId));
          queryClient.invalidateQueries(queryKeys.customer(customer.id));
        } else if (r.status === 400) {
          const {
            error: {
              conflictRecord: { customerId },
            },
          } = await r.json();

          if (customerId) {
            const conflictCustomer = lookupCustomerById(customerId);

            if (conflictCustomer) {
              setConflictCustomerName(conflictCustomer.name);
            }
          }

          if (!conflictCustomerName) {
            console.error(`Couldn't assign ${crmAccountId}`);
          }
        } else {
          console.error(`Couldn't assign ${crmAccountId}`);
        }

        setAccountsSearch(undefined);
        setSelectedAccount(undefined);
      },
    }
  );

  const existingAssignment = React.useMemo(() => {
    const crm = (customer?.crms || []).find(
      (crm: CustomerCrm) => crm.crmRemoteId === link.remote_id
    );

    if (crm) {
      return (accounts || []).find(account => account.remote_id === crm.crmRemoteAccountId);
    }
    return;
  }, [customer?.crms, link.remote_id, accounts]);

  const toggleAssign = (assign?: boolean) => {
    if (selectedAccount) {
      const value = JSON.parse(selectedAccount.value);
      assignMutation.mutate({
        crmRemoteAccountId: value.remoteAccountId,
        crmAccountId: value.accountId,
        assign,
      });
    } else if (existingAssignment) {
      assignMutation.mutate({
        crmRemoteAccountId: existingAssignment?.remote_id,
        crmAccountId: existingAssignment?.id,
      });
    }
  };

  return (
    <div>
      <div className="flex sm:pr-2 space-x-3 py-3">
        <div className="basis-1/3 space-y-1">
          <div className="fog:text-caption-xl">{link.integration.name}</div>
          <div className="fog:text-body-s text-gray-500">{link.remote_id}</div>
        </div>
        <div className="basis-2/3">
          <div className="flex justify-between items-center">
            {existingAssignment ? (
              <>
                <div className="space-y-1">
                  <div className="fog:text-caption-xl">{existingAssignment.name}</div>
                  <div className="fog:text-body-s text-gray-500">
                    {existingAssignment.remote_id}
                  </div>
                </div>
                <div>
                  {existingAssignment?.remote_id && (
                    <ThinButton
                      className={classNames(
                        "self-center h-6 w-24 text-center",
                        !selectedAccount && "border-gray-300 text-gray-300 bg-white"
                      )}
                      onClick={() => toggleAssign()}
                      loading={assignMutation.isLoading}
                    >
                      Unassign
                    </ThinButton>
                  )}
                </div>
              </>
            ) : (
              <div className="mb-2">
                <div className="flex lg:flex-row lg:items-center space-y-2 lg:space-y-3 lg:space-x-2 flex-col">
                  <div className="inline-flex items-center rounded-lg bg-gray-100 dark:bg-black px-4">
                    <Icons.Search className="w-4 h-4 text-gray-500" />
                    <SelectSearch
                      selectedOption={selectedAccount}
                      searchInputValue={accountsSearch}
                      comboboxInputClassName={"bg-gray-100"}
                      comboboxButtonClassName={"bg-gray-100"}
                      setSearchInputValue={setAccountsSearch}
                      options={options}
                      wrapperClassName="w-52 lg:w-64 rounded-md"
                      searchInputPlaceholder="Search accounts"
                      onClearInput={() => {
                        setSelectedAccount(undefined);
                      }}
                      onChange={option => {
                        if (option) {
                          setAccountsSearch(option.option);
                          setSelectedAccount(option);
                        }
                      }}
                      displayValue={option => option?.option}
                    />
                  </div>
                  <ThickButton
                    className="lg:!mt-0 !py-2 !text-xs !px-4"
                    disabled={!selectedAccount?.value}
                    onClick={() => toggleAssign(true)}
                  >
                    Assign
                  </ThickButton>
                </div>
                {conflictCustomerName && (
                  <span className="text-brand-red-500 text-xs">
                    Error: Already assigned to {conflictCustomerName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <hr />
    </div>
  );
};
