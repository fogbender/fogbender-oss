import { useCallback } from "react";

import { ChartWrapper } from "../../components/ChartWrapper";
import { FogLineChart } from "../../components/FogLineChart";
import messages from "../mocks/messages.json";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="w-48 border bg-white p-5">
        <div className="font-bold">{label}</div>
        <div style={{ color: payload[0].stroke }}>Summary: {data.summary}</div>
        <div>Agents: {data.agents}</div>
        <div>Users: {data.users}</div>
      </div>
    );
  }

  return null;
};

export const MessagesChart = () => {
  const formatter = useCallback(() => <span>Total messages count</span>, []);

  return (
    <ChartWrapper title="Messages (Users/Agents)">
      <FogLineChart
        chartData={messages.data}
        stroke="rgb(209 13 86)"
        formatter={formatter}
        dataKey="summary"
        customTooltip={<CustomTooltip />}
      />
    </ChartWrapper>
  );
};
