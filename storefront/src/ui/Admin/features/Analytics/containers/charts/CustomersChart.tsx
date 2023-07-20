import { useCallback } from "react";

import { ChartWrapper } from "../../components/ChartWrapper";
import { FogLineChart } from "../../components/FogLineChart";
import customers from "../mocks/customers.json";

export const CustomersChart = () => {
  const formatter = useCallback(() => <span>Customers count</span>, []);

  return (
    <ChartWrapper title="Customers">
      <FogLineChart chartData={customers.data} formatter={formatter} />
    </ChartWrapper>
  );
};
