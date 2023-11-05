import classNames from "classnames";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  type Customer,
  CustomerAvatar,
  FilterInput,
  formatCustomerName,
  Icons,
  LinkButton,
  Modal,
  ThinButton,
  useSortedCustomers,
} from "fogbender-client/src/shared";
import React, { useState } from "react";
import { useMutation, useQuery } from "react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { getServerUrl } from "../../config";
import { queryClient, queryKeys } from "../client";

import { CustomerDetails } from "./CustomerDetails";
import { SeedCustomers } from "./SeedCustomers";
import { UsersHome } from "./UsersHome";

dayjs.extend(relativeTime);

export const CustomersHome: React.FC<{ vendorId: string; workspaceId: string }> = ({
  vendorId,
  workspaceId,
}) => {
  const { data: allCustomers, status: customersStatus } = useQuery<Customer[]>(
    queryKeys.customers(workspaceId),
    () =>
      fetch(`${getServerUrl()}/api/workspaces/${workspaceId}/customers`, {
        credentials: "include",
      }).then(res => res.json())
  );

  const [customersSearch, setCustomersSearch] = React.useState<string>();

  const customers = React.useMemo(
    () =>
      (allCustomers || []).filter(
        c => c.name.startsWith("$Cust_Internal_") === false && c.deletedAt === null
      ),
    [allCustomers]
  );

  const { sortedCustomers } = useSortedCustomers({
    customers: customers || [],
    roster: [],
    badges: {},
  });

  const filteredCustomers = React.useMemo(() => {
    if (customersSearch !== undefined) {
      return sortedCustomers.filter(c =>
        c.name.toLowerCase().includes(customersSearch.toLowerCase())
      );
    } else {
      return sortedCustomers;
    }
  }, [sortedCustomers, customersSearch]);

  function rosterInputSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  const urlParams = useParams();

  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>();

  React.useEffect(() => {
    const cid = urlParams["cid"];
    if (cid) {
      setSelectedCustomerId(cid);
    } else {
      setSelectedCustomerId(filteredCustomers[0]?.id);
    }
  }, [filteredCustomers, urlParams]);

  const existingCustomerIds = customers.map(x => x.externalUid);

  const customer = React.useMemo(
    () => customers?.find(x => x.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const [isUsersDetailsVisible, setIsUsersDetailsVisible] = React.useState(true);

  const lookupCustomerById = (id: string) => (allCustomers || []).find(c => c.id === id);

  return (
    <div className="relative h-full max-h-screen flex-1 flex flex-col z-10">
      <div className="relative h-full flex-1 flex">
        <div
          className={classNames(
            "absolute sm:static sm:z-0 z-10 top-0 left-0 bottom-0 flex flex-col bg-white text-sm transform sm:transform-none transition-transform",
            isUsersDetailsVisible ? "-translate-x-full" : "translate-x-0",
            "w-full sm:w-64",
            customersStatus === "loading" && "opacity-10"
          )}
        >
          <div className="flex overflow-hidden h-full">
            <div className={classNames("flex flex-col pl-3 pr-2 pt-2 w-full overflow-hidden")}>
              <form onSubmit={rosterInputSubmit} className="bg-white">
                <FilterInput
                  placeholder="Search customers"
                  value={customersSearch}
                  setValue={setCustomersSearch}
                />
              </form>
              <div className="flex-1 mt-3 fbr-scrollbar overflow-y-scroll">
                {filteredCustomers.map(customer => (
                  <Link
                    key={customer.id}
                    to={`/admin/vendor/${vendorId}/workspace/${workspaceId}/customers/${customer.id}`}
                    className="no-underline cursor-pointer"
                    onClick={() => setIsUsersDetailsVisible(true)}
                  >
                    <div
                      key={customer.id}
                      className={classNames(
                        "flex items-center gap-x-2 py-2.5 px-2 border-l-5 rounded-r fog:text-body-m truncate",
                        customer.id === selectedCustomerId
                          ? "border-brand-orange-500 bg-blue-50 text-black"
                          : "border-transparent fog:text-link"
                      )}
                    >
                      <CustomerAvatar name={formatCustomerName(customer.name)} />
                      <span className="truncate">{formatCustomerName(customer.name)}</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="border-gray-200 border-t pt-2">
                {vendorId && workspaceId && (
                  <SeedCustomers
                    vendorId={vendorId}
                    workspaceId={workspaceId}
                    existingCustomersIds={existingCustomerIds}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {customer && (
            <CustomerContainer
              customer={customer}
              workspaceId={workspaceId}
              vendorId={vendorId}
              onBack={() => {
                setIsUsersDetailsVisible(false);
              }}
              lookupCustomerById={lookupCustomerById}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const CustomerHome: React.FC<{
  vendorId: string;
  workspaceId: string;
  helpdeskId: string;
}> = ({ vendorId, workspaceId, helpdeskId }) => {
  const { data: allCustomers } = useQuery<Customer[]>(queryKeys.customers(workspaceId), () =>
    fetch(`${getServerUrl()}/api/workspaces/${workspaceId}/customers`, {
      credentials: "include",
    }).then(res => res.json())
  );

  const customer = React.useMemo(
    () => (allCustomers || []).find(c => c.helpdeskId === helpdeskId),
    [allCustomers, helpdeskId]
  );

  const lookupCustomerById = (id: string) => (allCustomers || []).find(c => c.id === id);

  return customer ? (
    <CustomerDetails
      customer={customer}
      workspaceId={workspaceId}
      vendorId={vendorId}
      lookupCustomerById={lookupCustomerById}
    />
  ) : null;
};

const CustomerContainer: React.FC<{
  customer: Customer;
  workspaceId: string;
  vendorId: string;
  onBack: () => void;
  lookupCustomerById: (x: string) => Customer | undefined;
}> = ({ customer, workspaceId, vendorId, lookupCustomerById, onBack }) => {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const deleteCustomerMutation = useMutation(
    (customerId: string) => {
      return fetch(`${getServerUrl()}/api/vendors/${vendorId}/customers/${customerId}`, {
        method: "DELETE",
        credentials: "include",
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(queryKeys.customers(workspaceId));
        navigate(`/admin/vendor/${vendorId}/workspace/${workspaceId}/customers`, { replace: true });
        setShowDeleteModal(false);
      },
    }
  );

  const onDeleteCustomer = () => {
    deleteCustomerMutation.mutate(customer.id);
  };

  const deleteCustomerBtn = (
    <ThinButton onClick={() => setShowDeleteModal(true)}>Delete customer</ThinButton>
  );

  return (
    <div className="bg-white h-full pt-6 sm:pl-4">
      {customer && workspaceId && (
        <>
          <div className="h-full pl-4 pr-2 sm:pl-6 xl:pr-24 border border-b-0 border-l-200 border-r-0 border-t-0 fbr-scrollbar overflow-y-scroll space-y-6">
            {/* Customer Title */}
            <section>
              <div className="flex justify-between">
                <button
                  onClick={onBack}
                  className="flex items-center space-x-2 text-blue-700 hover:text-brand-red-500 sm:hidden"
                >
                  <span>
                    <Icons.ArrowBack />
                  </span>
                  <span>Customers</span>
                </button>
                <div className="sm:hidden">{deleteCustomerBtn}</div>
              </div>
              <div className="flex justify-between items-center space-x-8">
                <div className="fog:text-header2">{formatCustomerName(customer.name)}</div>
                <div className="hidden sm:block">{deleteCustomerBtn}</div>
              </div>
            </section>
            {/* Customer Details */}
            <section>
              <CustomerDetails
                customer={customer}
                workspaceId={workspaceId}
                vendorId={vendorId}
                lookupCustomerById={lookupCustomerById}
              />
            </section>
            {/* Users Home */}
            <section>
              <UsersHome customer={customer} />
            </section>
          </div>
          {showDeleteModal && (
            <Modal onClose={() => setShowDeleteModal(false)}>
              <h2 className="fog:text-header2 mb-4">Delete Customer</h2>
              <div className="fog:text-body-l">
                Are you sure you want to delete the customer{" "}
                <span className="fog:text-caption-xl">{customer.name}</span> ?
              </div>
              <div className="flex justify-end">
                <LinkButton
                  position="end"
                  className=" col-start-3 !text-brand-red-500"
                  onClick={onDeleteCustomer}
                >
                  Delete customer
                </LinkButton>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
};
