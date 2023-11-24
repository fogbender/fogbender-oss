import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  DetailedRoomsTable,
  formatCustomerName,
  Icons,
  isInternalHelpdesk,
  type Tag,
} from "fogbender-client/src/shared";
import { type RenderCustomerInfoCb } from "fogbender-client/src/shared/app/CustomerInfo";
import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import { SwitchOff, SwitchOn } from "fogbender-client/src/shared/components/Icons";
import React from "react";
import { Link } from "react-router-dom";

import { useCustomerQuery } from "../useCustomer";

dayjs.extend(relativeTime);

export const CustomerInfoPane: React.FC<Parameters<RenderCustomerInfoCb>[0]> = ({
  ourId,
  helpdeskId,
  activeRoomId,
  openRosterClick,
  users,
  rooms,
  roomsLoading,
  agents,
  setShowIssueInfo,
}) => {
  const sortedRooms = React.useMemo(() => {
    return rooms.slice().sort((r0, r1) => {
      if (r0?.lastMessage && r1?.lastMessage) {
        return r0.lastMessage.createdTs > r1.lastMessage.createdTs ? -1 : 1;
      } else if (r0?.lastMessage) {
        return -1;
      } else if (r1?.lastMessage) {
        return 1;
      }

      return 0;
    });
  }, [rooms]);

  const customerData = useCustomerQuery(helpdeskId);

  const { data: customer } = customerData;

  const isCustomerInternal = isInternalHelpdesk(customer?.name);

  const customerName = () => (
    <span className="flex gap-2 font-semibold items-center">
      <div>{formatCustomerName(customer?.name)}</div>
      {(customerData.isLoading || customerData.isRefetching) && (
        <Icons.Spinner className="w-3 h-3 text-blue-500" />
      )}
    </span>
  );

  const [showClosed, setShowClosed] = React.useState(false);

  return (
    <div className="text-sm">
      {customer ? (
        <div className="mt-3 p-2 flex flex-col gap-2">
          {isCustomerInternal ? (
            customerName()
          ) : (
            <>
              <Link
                to={`/admin/vendor/${customer.vendorId}/workspace/${customer.workspaceId}/customers/${customer.id}`}
                className="fog:text-chat-username-m fog:text-link no-underline cursor-pointer"
              >
                {customerName()}
              </Link>
              <span>Customer since: {dayjs(customer.insertedAt / 1000).fromNow()}</span>
            </>
          )}
          <div
            className="cursor-pointer flex gap-3 items-center"
            onClick={() => setShowClosed(x => !x)}
          >
            <div className="text-left">
              {showClosed ? <SwitchOn className="w-7" /> : <SwitchOff className="w-7" />}
            </div>
            <div className="text-left">Show closed</div>
          </div>
        </div>
      ) : (
        <div className="mt-3 p-2 flex flex-col gap-2">
          <Icons.Spinner className="w-3 h-3 text-blue-500" />
        </div>
      )}

      {setShowIssueInfo && customer && (
        <DetailedRoomsTable
          ourId={ourId}
          rooms={sortedRooms}
          agents={agents}
          activeRoomId={activeRoomId}
          openRosterClick={openRosterClick}
          onTagClick={(tag: Tag) => setShowIssueInfo(tag)}
          loading={roomsLoading}
          showClosed={showClosed}
          vendorId={customer.vendorId}
        />
      )}

      {!isCustomerInternal && (
        <table className="text-xs mt-3 w-full">
          <thead className="border-b dark:border-gray-500">
            <tr>
              <td className="p-2 text-left">Team</td>
            </tr>
          </thead>

          <tbody>
            {users.map(u => (
              <tr key={u.userId}>
                <td className="p-2 flex flex-col">
                  <span className="font-semibold">{u.name}</span>
                  <span>
                    <span className="break-all">
                      {u.email}{" "}
                      <ClipboardCopy className="inline-block align-middle" text={u.email}>
                        <Icons.Clipboard className="w-3 h-3" />
                      </ClipboardCopy>
                    </span>
                  </span>
                  <span>Joined: {dayjs(u.createdTs / 1000).fromNow()}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
