import { ChartWrapper } from "../../components/ChartWrapper";
import { FogPieChart } from "../../components/FogPieChart";
import usersByIssues from "../mocks/usersByIssues.json";

export const TopUsersByIssuesChart = () => {
  return (
    <ChartWrapper title="Users by issues count">
      <FogPieChart chartData={usersByIssues.data} />
    </ChartWrapper>
  );
};
