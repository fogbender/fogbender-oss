/* eslint-disable jsx-a11y/anchor-is-valid */

export const Dashboard = () => {
  return (
    <div>
      <h3 className="text-lg font-medium leading-6 text-gray-900">Last 30 days</h3>
      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-indigo-500 p-3">
                <svg
                  className="h-6 w-6 text-white"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium leading-5 text-gray-500">
                    Total Subscribers
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold leading-8 text-gray-900">71,897</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold leading-5 text-green-600">
                      <svg
                        className="h-5 w-5 flex-shrink-0 self-center text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="sr-only">Increased by</span>
                      122
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm leading-5">
              <a
                href="#"
                className="font-medium text-indigo-600 transition duration-150 ease-in-out hover:text-indigo-500"
              >
                View all
              </a>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-indigo-500 p-3">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium leading-5 text-gray-500">
                    Avg. Open Rate.
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold leading-8 text-gray-900">58.16%</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold leading-5 text-green-600">
                      <svg
                        className="h-5 w-5 flex-shrink-0 self-center text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="sr-only">Increased by</span>
                      5.4%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm leading-5">
              <a
                href="#"
                className="font-medium text-indigo-600 transition duration-150 ease-in-out hover:text-indigo-500"
              >
                View all
              </a>
            </div>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 rounded-md bg-indigo-500 p-3">
                <svg
                  className="h-6 w-6 text-white"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium leading-5 text-gray-500">
                    Avg. Click Rate
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold leading-8 text-gray-900">24.57</div>
                    <div className="ml-2 flex items-baseline text-sm font-semibold leading-5 text-red-600">
                      <svg
                        className="h-5 w-5 flex-shrink-0 self-center text-red-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="sr-only">Decreased by</span>
                      3.2%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm leading-5">
              <a
                href="#"
                className="font-medium text-indigo-600 transition duration-150 ease-in-out hover:text-indigo-500"
              >
                View all
              </a>
            </div>
          </div>
        </div>
      </div>
      <h3 className="mt-10 text-lg font-medium leading-6 text-gray-900">Last 30 days</h3>
      <div className="mt-5 grid grid-cols-1 overflow-hidden rounded-lg bg-white shadow md:grid-cols-3">
        <div>
          <div className="px-4 py-5 sm:p-6">
            <dl>
              <dt className="text-base font-normal leading-6 text-gray-900">Total Subscribers</dt>
              <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-baseline text-2xl font-semibold leading-8 text-indigo-600">
                  71,897
                  <span className="ml-2 text-sm font-medium leading-5 text-gray-500">
                    from 70,946
                  </span>
                </div>
                <div className="inline-flex items-baseline rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium leading-5 text-green-800 md:mt-2 lg:mt-0">
                  <svg
                    className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="sr-only">Increased by</span>
                  12%
                </div>
              </dd>
            </dl>
          </div>
        </div>
        <div className="border-t border-gray-200 md:border-0 md:border-l">
          <div className="px-4 py-5 sm:p-6">
            <dl>
              <dt className="text-base font-normal leading-6 text-gray-900">Avg. Open Rate</dt>
              <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-baseline text-2xl font-semibold leading-8 text-indigo-600">
                  58.16%
                  <span className="ml-2 text-sm font-medium leading-5 text-gray-500">
                    from 56.14%
                  </span>
                </div>
                <div className="inline-flex items-baseline rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium leading-5 text-green-800 md:mt-2 lg:mt-0">
                  <svg
                    className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="sr-only">Increased by</span>
                  2.02%
                </div>
              </dd>
            </dl>
          </div>
        </div>
        <div className="border-t border-gray-200 md:border-0 md:border-l">
          <div className="px-4 py-5 sm:p-6">
            <dl>
              <dt className="text-base font-normal leading-6 text-gray-900">Avg. Click Rate</dt>
              <dd className="mt-1 flex items-baseline justify-between md:block lg:flex">
                <div className="flex items-baseline text-2xl font-semibold leading-8 text-indigo-600">
                  24.57%
                  <span className="ml-2 text-sm font-medium leading-5 text-gray-500">
                    from 28.62
                  </span>
                </div>
                <div className="inline-flex items-baseline rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-medium leading-5 text-red-800 md:mt-2 lg:mt-0">
                  <svg
                    className="-ml-1 mr-0.5 h-5 w-5 flex-shrink-0 self-center text-red-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="sr-only">Decreased by</span>
                  4.05%
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
