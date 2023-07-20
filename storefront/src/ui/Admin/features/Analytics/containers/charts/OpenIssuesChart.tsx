import { useCallback } from "react";

import { ChartWrapper } from "../../components/ChartWrapper";
import { FogLineChart } from "../../components/FogLineChart";
import openIssues from "../mocks/openIssues.json";

export const OpenIssuesChart = () => {
  const formatter = useCallback(() => <span>Open issues count</span>, []);

  return (
    <ChartWrapper title="Open issues">
      <FogLineChart chartData={openIssues.data} stroke="#fec9c1" formatter={formatter} />
    </ChartWrapper>
  );
};
