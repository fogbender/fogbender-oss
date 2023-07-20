import React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type FogPieChartProps = {
  chartData: any[];
};

const COLORS = [
  "#fec9c1",
  "#fc8b7a",
  "#ff6f62",
  "#6768ab",
  "#434153",
  "#eab1a2",
  "#dd98d1",
  "#330c35",
  "#060256",
  "#c36fb1",
];

export const FogPieChart: React.FC<FogPieChartProps> = ({ chartData }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart width={400} height={400}>
      <Pie
        dataKey="value"
        isAnimationActive={false}
        data={chartData}
        cx="50%"
        cy="50%"
        outerRadius={120}
        fill="#8884d8"
      >
        {chartData.map((_entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);
