import { Helpdesk } from "fogbender-proto";
import React from "react";

import { Avatar, ThickButton } from "../components/lib";
import { isExternalHelpdesk } from "../utils/format";

export const Welcome: React.FC<{
  isProfile: boolean;
  helpdesk: Helpdesk | undefined;
  userInfo:
    | { id: string; name: string; avatarUrl: string | undefined; customerName: string | undefined }
    | undefined;
  onAvatarClick: () => void;
  onClose: () => void;
  changeArrowOff: boolean;
  disable: boolean;
}> = ({ isProfile, helpdesk, userInfo, onAvatarClick, onClose, changeArrowOff, disable }) => {
  return (
    <div className="fixed inset-0 p-4 z-10 sm:relative sm:p-0 flex flex-col justify-center bg-white">
      <div className="absolute top-0 left-0 right-0 sm:relative sm:-mt-4 sm:-mx-8 sm:mb-4 sm:rounded-t-xl p-3 bg-blue-500 text-white fog:text-header3">
        {isProfile ? "Update profile" : "Welcome!"}
      </div>
      <div className="flex-1 flex flex-col gap-y-4 mt-24 sm:mt-4">
        {userInfo && (
          <div className="flex flex-col items-center gap-x-2">
            {changeArrowOff === false && (
              <p className="relative bottom-4 right-20 flex items-start gap-x-2 fog:text-body-m">
                Click to change
                <span className="relative top-4 transform scale-x-1.5 rotate-180 text-brand-red-500">
                  <Arrow />
                </span>
              </p>
            )}
            <div
              onClick={disable ? undefined : onAvatarClick}
              className={disable ? "cursor-default" : "cursor-pointer"}
            >
              <Avatar url={userInfo.avatarUrl} name={userInfo.name} size={40} />
            </div>
            <div className="fog:text-caption-xl">{userInfo.name}</div>
            {userInfo.customerName && isExternalHelpdesk(userInfo.customerName) !== true && (
              <div className="fog:text-body-m">{userInfo.customerName}</div>
            )}
          </div>
        )}
        {helpdesk && (
          <div className="flex-1 flex flex-col gap-y-2 p-4 bg-gray-100 fog:text-caption-xl">
            <p>
              <span className="text-brand-purple-500">Our team</span> is here to help
            </p>
            <p className="ml-10 flex items-end gap-x-2 fog:text-body-m">
              <span className="relative bottom-1 text-brand-purple-500">
                <Arrow />
              </span>
              {helpdesk.vendorName}
            </p>
            {userInfo && isExternalHelpdesk(userInfo.customerName) !== true && (
              <>
                <p className="mt-4">
                  <span>
                    ...but, <span className="text-brand-orange-500">your team</span> is here to help
                    as well
                  </span>
                </p>
                <p className="ml-20 flex items-end gap-x-2 fog:text-body-m">
                  <span className="relative bottom-1 text-brand-orange-500">
                    <Arrow />
                  </span>
                  {userInfo?.customerName}
                </p>
              </>
            )}
          </div>
        )}
        <ThickButton onClick={onClose}>{isProfile ? "Done" : "Sounds good, let’s go!"}</ThickButton>
      </div>
    </div>
  );
};

const Arrow = () => (
  <svg width="26" height="20" viewBox="0 0 26 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M3.58654 0.718845C3.74181 0.490496 4.0528 0.431259 4.28115 0.586537L8.00233 3.11693C8.23067 3.27221 8.28991 3.5832 8.13463 3.81155C7.97935 4.0399 7.66836 4.09914 7.44001 3.94386L4.13231 1.69462L1.88307 5.00232C1.72779 5.23067 1.4168 5.28991 1.18845 5.13463C0.9601 4.97935 0.900864 4.66836 1.05614 4.44001L3.58654 0.718845ZM26 20C19.1452 20 14.0167 17.9658 10.347 14.5537C6.68478 11.1484 4.52236 6.41459 3.50883 1.09356L4.49117 0.906444C5.47764 6.08541 7.56522 10.6016 11.028 13.8213C14.4833 17.0342 19.3548 19 26 19V20Z"
      fill="currentColor"
    />
  </svg>
);
