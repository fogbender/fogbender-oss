import { useCallback } from "react";

import { ChartWrapper } from "../../components/ChartWrapper";
import { FogLineChart } from "../../components/FogLineChart";
import users from "../mocks/users.json";

export const UsersChart = () => {
  const formatter = useCallback(() => <span>Users count</span>, []);

  return (
    <ChartWrapper title="Users">
      <FogLineChart chartData={users.data} stroke="rgba(255, 115, 21)" formatter={formatter} />
    </ChartWrapper>
  );
};
