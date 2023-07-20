import React, { ReactNode } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ComboBarLineChartProps = {
  chartData: any[];
  stroke?: string;
  formatter?: (value: string) => ReactNode;
  dataKey?: string;
  customTooltip?: any;
};

export const FogLineChart: React.FC<ComboBarLineChartProps> = ({
  chartData,
  stroke = "#8884d8",
  formatter,
  dataKey = "value",
  customTooltip,
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart width={300} height={300} data={chartData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip content={customTooltip} />
      <Legend formatter={formatter} />
      <Line
        type="monotone"
        dataKey={dataKey}
        stroke={stroke}
        activeDot={{ r: 8 }}
        strokeWidth={3}
      />
    </LineChart>
  </ResponsiveContainer>
);
