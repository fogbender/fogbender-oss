import { ChartWrapper } from "../../components/ChartWrapper";
import { FogPieChart } from "../../components/FogPieChart";
import customersByMessages from "../mocks/customersByMessages.json";

export const TopCustomersByMessagesChart = () => {
  return (
    <ChartWrapper title="Customers by messages count">
      <FogPieChart chartData={customersByMessages.data} />
    </ChartWrapper>
  );
};
