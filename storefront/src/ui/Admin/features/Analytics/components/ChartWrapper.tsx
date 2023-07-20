import React from "react";

type ChartWrapperProps = {
  title: string;
};

export const ChartWrapper: React.FC<ChartWrapperProps> = ({ children, title }) => (
  <div
    className="rounded-tl-3xl rounded-br-3xl border bg-white pb-20 pl-2 pr-2"
    style={{ height: 400 }}
  >
    <div className="p-5 font-medium">{title}</div>
    {children}
  </div>
);
