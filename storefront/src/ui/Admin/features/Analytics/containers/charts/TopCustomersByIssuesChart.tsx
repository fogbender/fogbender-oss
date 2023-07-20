import { ChartWrapper } from "../../components/ChartWrapper";
import { FogPieChart } from "../../components/FogPieChart";
import customersByIssues from "../mocks/customersByIssues.json";

export const TopCustomersByIssuesChart = () => {
  return (
    <ChartWrapper title="Customers by issues count">
      <FogPieChart chartData={customersByIssues.data} />
    </ChartWrapper>
  );
};
