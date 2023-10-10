import React from "react";

import { Layout } from "./Schedules";
import { HiddenOnSmallScreen } from "./Utils";

export const ScheduleOverview = React.memo(() => {
  return (
    <Layout>
      <HiddenOnSmallScreen>
        <Header />
        <Main />
      </HiddenOnSmallScreen>
    </Layout>
  );
});

const Header = () => {
  return (
    <div className="flex pb-4 justify-between font-admin items-center border-0 border-solid border-gray-400 border-b select-none">
      <div className="flex gap-x-3 items-center text-xl">
        <div className="flex items-center h-full">
          <div className="h-full rounded-full hover:bg-gray-100" />
        </div>
      </div>
    </div>
  );
};

const Main = () => {
  return (
    <div className="h-[500px] overflow-auto fbr-scrollbar mt-6 relative w-[874px]">
      <div className="flex sticky top-0 bg-white mb-4 z-10 pb-2">
        <div className="w-28 flex flex-col gap-2" />
      </div>
    </div>
  );
};
