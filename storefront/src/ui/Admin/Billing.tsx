import classNames from "classnames";
import dayjs from "dayjs";
import {
  Icons,
  type StripeCustomer,
  ThinButton,
  type VendorBilling,
} from "fogbender-client/src/shared";
import React from "react";
import { useMutation, useQuery } from "react-query";
import { Link, useLocation } from "react-router-dom";

import { getQueryParam } from "../../params";
import { type Vendor } from "../../redux/adminApi";
import { apiServer, queryClient, queryKeys } from "../client";

export const Billing = ({
  vendor,
  countInViolation,
}: {
  vendor: Vendor;
  countInViolation: number;
}) => {
  const setStripeSessionIdMutation = useMutation({
    mutationFn: (session_id: string) => {
      return apiServer
        .url(`/api/vendors/${vendor.id}/set-stripe-session-id`)
        .post({
          session_id,
        })
        .json<StripeCustomer>();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.billing(vendor.id));
    },
  });

  const { data: billing, isLoading: billingIsLoading } = useQuery({
    queryKey: queryKeys.billing(vendor.id),
    queryFn: () => apiServer.get(`/api/vendors/${vendor.id}/billing`).json<VendorBilling>(),
  });

  const subscriptions = billing?.subscriptions;
  const freeSeats = billing?.free_seats;

  const location = useLocation();
  const stripeSessionId = getQueryParam(location.search, "session_id");

  React.useEffect(() => {
    if (stripeSessionId) {
      setStripeSessionIdMutation.mutate(stripeSessionId);
    }
  }, [stripeSessionId]);

  const createCheckoutSessionMutation = useMutation({
    mutationFn: () => {
      return apiServer
        .url(`/api/vendors/${vendor.id}/create-checkout-session`)
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

  const cancelSubscriptionMutation = useMutation({
    mutationFn: (subscriptionId: string) => {
      return apiServer
        .url(`/api/vendors/${vendor.id}/cancel-subscription`)
        .post({ subscriptionId })
        .text();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(queryKeys.billing(vendor.id));
    },
  });

  const price_per_seat = (billing?.price_per_seat || 0) / 100;

  return (
    <div className="w-full bg-white p-4 rounded-xl fog:box-shadow-s flex flex-col gap-4 pl-8">
      <div className="w-full flex flex-col gap-2 overflow-auto">
        {billingIsLoading && (
          <span className="w-3 h-3 flex">
            <Icons.Spinner className="w-full" />
          </span>
        )}
        {billing && subscriptions?.length === 0 && (
          <div className="flex flex-col gap-4">
            <span>
              <span className="font-medium">{vendor.name}</span> is currently on a free tier.
            </span>

            <>
              <span>
                Your free tier is limited to {freeSeats} customer-facing agents (any role above
                “Reader”). You can adjust agent roles under{" "}
                <Link className="fog:text-link" to="/admin/-/team">
                  Team settings
                </Link>
                .
              </span>
              <span>
                Additional customer-facing agents cost ${price_per_seat} per agent, per month. See{" "}
                <a className="fog:text-link" href="/pricing">
                  pricing
                </a>{" "}
                for details.
              </span>
              {/*
              <span>
                Alternatively&mdash;since Fogbender is free and open-source software&mdash;you can{" "}
                <a className="fog:text-link" href="https://github.com/fogbender/fogbender">
                  host your own Fogbender
                </a>
                .
              </span>
              */}
            </>

            {countInViolation > 0 && (
              <ThinButton
                onClick={() => createCheckoutSessionMutation.mutate()}
                className="mt-4 max-w-min"
              >
                Buy a subscription
              </ThinButton>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {subscriptions?.map((subscription, i) => (
            <div key={i} className="flex flex-col rounded-lg py-2 px-3">
              <table className="table-auto">
                <tbody>
                  <Row>
                    <Cell>Email</Cell>
                    <Cell>{subscription.email}</Cell>
                  </Row>
                  <Row>
                    <Cell>Name</Cell>
                    <Cell>{subscription.name}</Cell>
                  </Row>
                  <Row>
                    <Cell>status</Cell>
                    <Cell>
                      <span
                        className={classNames(subscription.status !== "active" && "text-red-600")}
                      >
                        {subscription.status}
                      </span>
                    </Cell>
                  </Row>
                  <Row>
                    <Cell>Created on</Cell>
                    <Cell>
                      {dayjs(subscription.created_ts_sec * 1000).format("YYYY-MM-DD hh:mm:ss")}
                    </Cell>
                  </Row>
                  {subscription.canceled_at_ts_sec === null && (
                    <Row>
                      <Cell>Renews on</Cell>
                      <Cell>
                        {dayjs(subscription.period_end_ts_sec * 1000).format("YYYY-MM-DD hh:mm:ss")}
                      </Cell>
                    </Row>
                  )}
                  {subscription.cancel_at_ts_sec && (
                    <Row>
                      <Cell>Cancels on</Cell>
                      <Cell>
                        {dayjs(subscription.cancel_at_ts_sec * 1000).format("YYYY-MM-DD hh:mm:ss")}
                      </Cell>
                    </Row>
                  )}
                  {billing && (
                    <Row>
                      <Cell>Free seats</Cell>
                      <Cell>{billing.free_seats}</Cell>
                    </Row>
                  )}
                  {billing && (
                    <Row>
                      <Cell>Paid seats</Cell>
                      <Cell>{billing.paid_seats}</Cell>
                    </Row>
                  )}
                  {billing && (
                    <Row>
                      <Cell>Used seats</Cell>
                      <Cell>{billing.used_seats}</Cell>
                    </Row>
                  )}
                  <Row>
                    <Cell>Cost</Cell>
                    <Cell>
                      {subscription.quantity} x ${price_per_seat} = $
                      {price_per_seat * subscription.quantity} per month
                    </Cell>
                  </Row>
                </tbody>
              </table>

              {billing && billing.used_seats < billing.free_seats + billing.paid_seats && (
                <div className="mt-4 text-sm text-gray-600">
                  Note: Even though your current usage falls under the free tier, to maintain a
                  subscription, you must be paying for at least one seat. You can{" "}
                  <button
                    onClick={() => cancelSubscriptionMutation.mutate(subscription.id)}
                    className="fog:text-link"
                  >
                    cancel your subscription
                  </button>{" "}
                  immediately and receive a prorated refund.
                </div>
              )}

              <ThinButton
                className="max-w-min mt-4"
                onClick={() => (window.location.href = subscription.portal_session_url)}
              >
                Manage subscription
              </ThinButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Row = ({ children }: { children: React.ReactNode }) => {
  return <tr className="even:bg-gray-50 odd:bg-blue-50">{children}</tr>;
};

const Cell = ({ children }: { children: React.ReactNode }) => {
  return <td className="p-1 odd:text-gray-600 even:font-medium">{children}</td>;
};
