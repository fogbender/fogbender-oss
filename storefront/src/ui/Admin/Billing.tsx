import dayjs from "dayjs";
import { Icons, StripeCustomer, ThinButton, VendorBilling } from "fogbender-client/src/shared";
import React from "react";
import { useMutation, useQuery } from "react-query";
import { useLocation } from "react-router-dom";

import { getQueryParam } from "../../params";
import { Vendor } from "../../redux/adminApi";
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

  return (
    <div className="w-full bg-white p-4 rounded-xl fog:box-shadow-s flex flex-col gap-4 pl-8">
      <div className="w-full flex flex-col gap-2 overflow-auto">
        {billingIsLoading && (
          <span className="w-3 h-3 flex">
            <Icons.Spinner className="w-full" />
          </span>
        )}
        {subscriptions?.length === 0 && (
          <div className="flex flex-col gap-4">
            <span>{vendor.name} does’t have any active subscriptions.</span>

            {countInViolation > 0 && (
              <>
                <span>Your free tier is limited to {freeSeats} customer-facing agents.</span>
                <span>
                  Additional customer-facing agents cost $25 per agent, per month. See{" "}
                  <a className="fog:text-link" href="/pricing">
                    pricing
                  </a>{" "}
                  for details.
                </span>
                <span>
                  Fogbender is free and open-source software: alternatively, you can{" "}
                  <a className="fog:text-link" href="https://github.com/fogbender/fogbender">
                    host your own Fogbender
                  </a>
                  .
                </span>
              </>
            )}

            {countInViolation > 0 && (
              <ThinButton
                onClick={() => createCheckoutSessionMutation.mutate()}
                className="max-w-min"
              >
                Buy a subscription
              </ThinButton>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {subscriptions?.map((subscription, i) => (
            <div key={i} className="flex flex-col bg-gray-100 rounded-lg py-2 px-3">
              <span>Email: {subscription.email}</span>
              <span>Name: {subscription.name}</span>
              <span>
                Created on {dayjs(subscription.created_ts_sec * 1000).format("YYYY-MM-DD hh:mm:ss")}
              </span>
              {subscription.canceled_at_ts_sec === null && (
                <span>
                  Renews on{" "}
                  {dayjs(subscription.period_end_ts_sec * 1000).format("YYYY-MM-DD hh:mm:ss")}
                </span>
              )}
              {subscription.cancel_at_ts_sec && (
                <span>
                  Cancels on{" "}
                  {dayjs(subscription.cancel_at_ts_sec * 1000).format("YYYY-MM-DD hh:mm:ss")}
                </span>
              )}
              <span>Seats: {subscription.quantity}</span>
              <a className="fog:text-link" href={subscription.portal_session_url}>
                Manage subscription
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
