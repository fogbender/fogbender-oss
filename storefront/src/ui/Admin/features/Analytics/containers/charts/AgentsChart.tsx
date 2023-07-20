import { useCallback } from "react";

import { ChartWrapper } from "../../components/ChartWrapper";
import { FogLineChart } from "../../components/FogLineChart";
import agents from "../mocks/agents.json";

export const AgentsChart = () => {
  const formatter = useCallback(() => <span>Agents count</span>, []);

  return (
    <ChartWrapper title="Agents">
      <FogLineChart chartData={agents.data} formatter={formatter} />
    </ChartWrapper>
  );
};
