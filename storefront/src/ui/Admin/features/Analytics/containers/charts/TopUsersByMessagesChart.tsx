import { ChartWrapper } from "../../components/ChartWrapper";
import { FogPieChart } from "../../components/FogPieChart";
import usersByMessages from "../mocks/usersByMessages.json";

export const TopUsersByMessagesChart = () => {
  return (
    <ChartWrapper title="Users by messages count">
      <FogPieChart chartData={usersByMessages.data} />
    </ChartWrapper>
  );
};
