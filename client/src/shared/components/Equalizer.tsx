import React from "react";

export const Equalizer = ({ active }: { active: boolean }) => {
  const [levels, setLevels] = React.useState(Array(7).fill(0));

  React.useEffect(() => {
    if (!active) {
      setLevels(Array(7).fill(0));
      return;
    }
    const interval = setInterval(() => {
      setLevels(Array(7).fill(0).map(() => Math.floor(Math.random() * 4)));
    }, 200);
    return () => clearInterval(interval);
  }, [active]);

  const colors = [
    { active: "bg-red-500", inactive: "bg-red-200" },
    { active: "bg-orange-500", inactive: "bg-orange-200" },
    { active: "bg-yellow-500", inactive: "bg-yellow-200" },
    { active: "bg-green-500", inactive: "bg-green-200" },
    { active: "bg-blue-500", inactive: "bg-blue-200" },
    { active: "bg-indigo-500", inactive: "bg-indigo-200" },
    { active: "bg-violet-500", inactive: "bg-violet-200" },
  ];

  return (
    <div className="flex space-x-px h-[15px] items-center">
      {levels.map((level, bandIndex) => (
        <div key={bandIndex} className="flex flex-col-reverse items-center gap-px">
          {Array(3)
            .fill(0)
            .map((_, dotIndex) => {
              const isActive = dotIndex < level;
              const colorClass = isActive
                ? colors[bandIndex].active
                : colors[bandIndex].inactive;
              return (
                <div key={dotIndex} className={`w-1 h-[3px] ${colorClass}`} />
              );
            })}
        </div>
      ))}
    </div>
  );
};
