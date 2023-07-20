import { AgentsChart } from "./charts/AgentsChart";
import { CustomersChart } from "./charts/CustomersChart";
import { MessagesChart } from "./charts/MessagesChart";
import { OpenIssuesChart } from "./charts/OpenIssuesChart";
import { TopCustomersByIssuesChart } from "./charts/TopCustomersByIssuesChart";
import { TopCustomersByMessagesChart } from "./charts/TopCustomersByMessagesChart";
import { TopCustomersByUsersChart } from "./charts/TopCustomersByUsersChart";
import { TopUsersByIssuesChart } from "./charts/TopUsersByIssuesChart";
import { TopUsersByMessagesChart } from "./charts/TopUsersByMessagesChart";
import { UsersChart } from "./charts/UsersChart";

export const AnalyticsDashboardsContainer = () => (
  <>
    <div className="grid grid-cols-2 gap-8">
      <CustomersChart />
      <TopCustomersByUsersChart />
      <UsersChart />
      <TopCustomersByMessagesChart />
      <MessagesChart />
      <TopCustomersByIssuesChart />
      <OpenIssuesChart />
      <TopUsersByMessagesChart />
      <AgentsChart />
      <TopUsersByIssuesChart />
    </div>
  </>
);
