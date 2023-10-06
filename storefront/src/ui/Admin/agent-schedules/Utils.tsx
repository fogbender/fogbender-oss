import React from "react";

export const DaysOfWeek = {
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
  7: "sunday",
};

export const HiddenOnSmallScreen = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <div className="hidden lg:block">{children}</div>
      <p className="block lg:hidden og:text-caption-l">
        This feature is exclusively accessible on screens with a width exceeding 1024 pixels.
      </p>
    </>
  );
};
