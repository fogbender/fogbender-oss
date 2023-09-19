import classNames from "classnames";
import React from "react";
import { ThinButton } from "fogbender-client/src/shared";

type ShiftModes = "add" | "edit" | undefined;

export const Layout = (props: { children: React.ReactNode; className?: string }) => {
  const { children, className } = props;
  return (
    <div
      className={classNames("w-full bg-white p-6 rounded-xl fog:box-shadow-s relative", className)}
    >
      {children}
    </div>
  );
};

export const Schedules = () => {
  const [shiftMode, setShiftMode] = React.useState<ShiftModes>();

  return (
    <Layout className="px-4 py-4">
      <ThinButton disabled={shiftMode === "add"} onClick={() => setShiftMode("add")}>
        Add a shift
      </ThinButton>
    </Layout>
  );
};
