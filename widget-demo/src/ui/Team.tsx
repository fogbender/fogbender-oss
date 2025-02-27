/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";

import { useCustomerName } from "../store";

export const teamMembers = [
  { userName: "Alice Smith", customerName: "Marin Farm LLC" },
  { userName: "Marina Collins", customerName: "Marin Farm LLC" },
  { userName: "Bob Jones", customerName: "Marin Farm LLC" },
  { userName: "James Lee", customerName: "Tractors Unlimited" },
  { userName: "Jeeta Anantaraman", customerName: "Tractors Unlimited" },
  { userName: "Ray Wilson", customerName: "Sailing Ships" },
  { userName: "Olga Kim", customerName: "Sailing Ships" },
];

export const Team = () => {
  const customerName = useCustomerName();

  const team = React.useMemo(() => {
    let ourTeam = teamMembers;
    if (customerName) {
      ourTeam = teamMembers.filter(member => member.customerName === customerName);
      if (ourTeam.length === 0) {
        ourTeam = teamMembers;
      }
    }
    return ourTeam;
  }, [customerName]);

  return (
    <div className="overflow-hidden bg-white sm:rounded-lg sm:shadow">
      <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6">
        <h3 className="break-words text-lg font-medium leading-6 text-gray-900">
          Team name: {customerName || "Marin Farm LLC"}
        </h3>
      </div>
      <ul>
        {team.map(({ userName: name }, i) => (
          <li key={name} className={i ? "border-t border-gray-200" : ""}>
            <a
              href="#"
              className="block transition duration-150 ease-in-out hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="truncate text-sm font-medium leading-5 text-indigo-600">
                    {name}
                  </div>
                  <div className="ml-2 flex flex-shrink-0">
                    <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                      Full-time
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex justify-between">
                  <div className="sm:flex">
                    <div className="mr-6 flex items-center text-sm leading-5 text-gray-500">
                      <svg
                        className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      Engineering
                    </div>
                  </div>
                  <div className="flex items-center text-sm leading-5 text-gray-500">
                    <svg
                      className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Remote
                  </div>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};
