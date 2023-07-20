import { ChartWrapper } from "../../components/ChartWrapper";
import { FogPieChart } from "../../components/FogPieChart";
import customersByUsers from "../mocks/customersByUsers.json";

export const TopCustomersByUsersChart = () => {
  return (
    <ChartWrapper title="Customers by users count">
      <FogPieChart chartData={customersByUsers.data} />
    </ChartWrapper>
  );
};
