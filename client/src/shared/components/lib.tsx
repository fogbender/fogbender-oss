import browser from "browser-detect";
import classNames from "classnames";
import React from "react";

import { isExternalHelpdesk, isInternalHelpdesk } from "../utils/format";

import { Icons } from "./Icons";

export const GroupDefaultIcon = ({ size = 20 }: { size?: number }) => {
  return (
    <svg height={`${size}`} viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M32 34H42V30C41.9999 28.7531 41.6113 27.5371 40.8883 26.5213C40.1652 25.5054 39.1436 24.74 37.9655 24.3315C36.7874 23.923 35.5112 23.8918 34.3145 24.242C33.1178 24.5923 32.0599 25.3067 31.288 26.286M32 34H12M32 34V30C32 28.688 31.748 27.434 31.288 26.286M31.288 26.286C30.5453 24.4299 29.2635 22.8389 27.608 21.7182C25.9525 20.5976 23.9992 19.9986 22 19.9986C20.0008 19.9986 18.0475 20.5976 16.392 21.7182C14.7365 22.8389 13.4547 24.4299 12.712 26.286M12 34H2V30C2.00009 28.7531 2.38867 27.5371 3.11172 26.5213C3.83477 25.5054 4.85637 24.74 6.0345 24.3315C7.21263 23.923 8.48875 23.8918 9.68548 24.242C10.8822 24.5923 11.9401 25.3067 12.712 26.286M12 34V30C12 28.688 12.252 27.434 12.712 26.286M28 8C28 9.5913 27.3679 11.1174 26.2426 12.2426C25.1174 13.3679 23.5913 14 22 14C20.4087 14 18.8826 13.3679 17.7574 12.2426C16.6321 11.1174 16 9.5913 16 8C16 6.4087 16.6321 4.88258 17.7574 3.75736C18.8826 2.63214 20.4087 2 22 2C23.5913 2 25.1174 2.63214 26.2426 3.75736C27.3679 4.88258 28 6.4087 28 8ZM40 14C40 15.0609 39.5786 16.0783 38.8284 16.8284C38.0783 17.5786 37.0609 18 36 18C34.9391 18 33.9217 17.5786 33.1716 16.8284C32.4214 16.0783 32 15.0609 32 14C32 12.9391 32.4214 11.9217 33.1716 11.1716C33.9217 10.4214 34.9391 10 36 10C37.0609 10 38.0783 10.4214 38.8284 11.1716C39.5786 11.9217 40 12.9391 40 14ZM12 14C12 15.0609 11.5786 16.0783 10.8284 16.8284C10.0783 17.5786 9.06087 18 8 18C6.93913 18 5.92172 17.5786 5.17157 16.8284C4.42143 16.0783 4 15.0609 4 14C4 12.9391 4.42143 11.9217 5.17157 11.1716C5.92172 10.4214 6.93913 10 8 10C9.06087 10 10.0783 10.4214 10.8284 11.1716C11.5786 11.9217 12 12.9391 12 14Z"
        stroke="#6B7280"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const UserDefaultIcon: React.FC<{ size?: number }> = ({ size = 35 }) => {
  return (
    <svg
      width={`${size}`}
      height={`${size}`}
      viewBox="0 0 40 40"
      fill="none"
      version="1.1"
      id="svg10"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs id="defs14" />
      <path
        d="m 33.605912,9.448705 c -3.8874,-4.66825 -5.8311,-7.00238 -7.9907,-8.13643 -3.6633,-1.92363301 -8.0499,-1.86923701 -11.6644,0.14464 -2.1309,1.18726 -4.0279199,3.58381 -7.8220099,8.37692 -3.14762,3.97645 -4.72143,5.96465 -5.40246098,8.00005 -1.158478,3.4624 -0.7131329,7.261 1.21478098,10.3616 1.13336,1.8227 3.1122,3.3834 7.06987,6.5047 3.1094199,2.4524 4.6642199,3.6786 6.3217199,4.3382 2.8142,1.1199 5.9434,1.1583 8.7841,0.1076 1.6732,-0.6189 3.2692,-1.8154 6.4611,-4.2083 4.2581,-3.1923 6.3871,-4.7885 7.5836,-6.6593 2.0269,-3.169 2.4864,-7.0933 1.2463,-10.6448 -0.732,-2.0966 -2.422,-4.126 -5.8019,-8.18488 z"
        fill="#d1d5db"
        id="path2"
      />
      <circle
        cx="34.946804"
        cy="18.040413"
        r="2.3553996"
        fill="#6b7280"
        id="circle6"
        strokeWidth="1.1777"
      />
      <circle
        cx="4.9571309"
        cy="18.00275"
        r="2.3553996"
        fill="#6b7280"
        id="circle6-3"
        strokeWidth="1.1777"
      />
      <path
        d="m 15.003848,21.061706 c 3.081705,3.081705 6.779748,3.081705 9.861454,0"
        stroke="#6b7280"
        strokeWidth="1.23268"
        strokeLinecap="round"
        id="path8"
      />
    </svg>
  );
};

const UserMask = () => {
  return `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M33.513 9.54162C29.6256 4.87337 27.6819 2.53924 25.5223 1.40519C21.859 -0.518443 17.4724 -0.464047 13.8579 1.54983C11.727 2.73709 9.82998 5.13364 6.03589 9.92675C2.88827 13.9032 1.31446 15.8914 0.633429 17.9268C-0.525049 21.3892 -0.0797039 25.1878 1.84821 28.2884C2.98157 30.1111 4.96041 31.6718 8.91808 34.7931C12.0275 37.2455 13.5823 38.4717 15.2398 39.1313C18.054 40.2512 21.1832 40.2896 24.0239 39.2389C25.6971 38.62 27.2931 37.4235 30.485 35.0306C34.743 31.8383 36.8721 30.2421 38.0686 28.3713C40.0955 25.2023 40.555 21.278 39.3149 17.7265C38.5829 15.6299 36.8929 13.6005 33.513 9.54162Z"
        fill="#000000"
      />
    </svg>
  `;
};

export const Avatar: React.FC<{
  url?: string;
  name?: string;
  size?: number;
  imageSize?: number;
  className?: string;
  bgClassName?: string;
  withTitle?: boolean;
  avatarType?: "user" | "group";
}> = ({
  url,
  name,
  size = 40,
  imageSize,
  className,
  bgClassName,
  withTitle = true,
  avatarType = "user",
}) => {
  const userMask = React.useMemo(() => "data:image/svg+xml;base64," + btoa(UserMask()), []);
  const newUrl = url?.includes("initials") ? `${url}?fontSize=40` : url;
  const defaultImg = () => {
    if (avatarType === "user") {
      return <UserDefaultIcon size={30} />;
    } else if (avatarType === "group") {
      return <GroupDefaultIcon size={15} />;
    } else {
      return null;
    }
  };
  return (
    <div
      className={classNames("flex items-center justify-center", bgClassName || "bg-opacity-0")}
      title={withTitle ? name : undefined}
      style={{
        width: `${size}px`,
        minWidth: `${size}px`,
        height: `${size}px`,
        minHeight: `${size}px`,
        maskImage: `url(${userMask})`,
        maskRepeat: "no-repeat",
        maskSize: `${size}px`,
        WebkitMaskImage: `url(${userMask})`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskSize: `${size}px`,
      }}
    >
      {url ? (
        <img
          alt=""
          className={classNames("w-full h-full", className)}
          src={newUrl}
          style={{
            width: `${imageSize}px`,
          }}
        />
      ) : (
        defaultImg()
      )}
    </div>
  );
};

export const CustomerAvatar: React.FC<{
  name: string | undefined;
  unreadCount?: number;
  hasMentions?: boolean;
  showUnread?: boolean;
}> = ({ name, unreadCount, hasMentions, showUnread }) => {
  const isSpecial = isInternalHelpdesk(name) || isExternalHelpdesk(name);

  const abbrName =
    name
      ?.split(" ")
      .slice(0, 2)
      .map(x => x.charAt(0).toUpperCase())
      .join("") || "C";

  // For 26 letters, we split color wheel by 13 degree arcs, to generate hue
  // If there is no second letter, duplicate first letter also as a second one
  // First hue is bright, and second one is darker
  const abbrNameGradient = `linear-gradient(135deg, hsl(${
    (abbrName.charCodeAt(0) % 26) * 13
  }deg 90% 66%) 0%, hsl(${
    ((abbrName.charCodeAt(1) || abbrName.charCodeAt(0)) % 26) * 13
  }deg 50% 50%) 100%)`;

  return (
    <span
      className={classNames(
        "relative flex flex-shrink-0 items-center justify-center w-8 h-8 border border-white rounded-md text-white font-bold text-2xs leading-none",
        isSpecial && "bg-gray-100"
      )}
      style={isSpecial ? {} : { background: abbrNameGradient }}
    >
      {isSpecial ? (
        <span className="text-blue-700">
          {isInternalHelpdesk(name) ? <Icons.ChatBubble /> : <Icons.Mail className="w-5" />}
        </span>
      ) : (
        abbrName
      )}
      {showUnread && !!unreadCount && (
        <span
          className={classNames(
            "absolute top-0 right-0 -mt-1 -mr-1 flex items-center justify-center border border-white rounded-full text-white text-2xs font-normal leading-none",
            isInternalHelpdesk(name) ? "bg-green-500" : "bg-brand-orange-500",
            hasMentions ? "w-3.5 h-3.5" : "w-3 h-3"
          )}
        >
          {hasMentions && <Icons.Mention className="w-2.5 h-2.5" />}
        </span>
      )}
    </span>
  );
};

export const RecentUnreadCircle: React.FC<{
  recentBadge?: boolean;
  setRecentBadge: (value: boolean) => void;
}> = ({ recentBadge, setRecentBadge }) => {
  React.useEffect(() => {
    setRecentBadge(false);
  }, [setRecentBadge]);
  return (
    <span
      className={classNames(
        "w-2 h-2 flex items-center justify-center bg-brand-purple-500 rounded-full border border-white ",
        !recentBadge && "hidden"
      )}
    />
  );
};

export const UnreadCircle: React.FC<{
  total: number | undefined;
  asMention?: boolean;
  isDialog?: boolean;
  isInternal?: boolean;
  dimmed?: boolean;
  className?: string | undefined;
}> = ({ total, asMention = false, isDialog, isInternal, dimmed, className }) => {
  return (
    <span
      className={classNames(
        "min-w-1rem min-h-1rem flex items-center justify-center rounded-full text-white fog:text-caption-s leading-none",
        dimmed ? "bg-gray-400" : isInternal ? "bg-green-500" : "bg-brand-orange-500",
        !(total || (!isDialog && asMention)) && "hidden",
        className
      )}
    >
      {!isDialog && asMention ? (
        <Icons.Mention className="w-3 h-3" />
      ) : (
        <span className="px-1">
          {total && total > 99 ? <>{total > 999 ? "1k+" : "99+"}</> : <>{total}</>}
        </span>
      )}
    </span>
  );
};

export const UnreadCircleExpanded: React.FC<{
  total: number | undefined;
  asMention: boolean;
}> = ({ total, asMention = false }) => {
  return (
    <span className="flex items-center justify-center gap-x-1">
      <span
        className={classNames(
          "min-w-1rem min-h-1rem flex items-center justify-center py-0.5 px-2 rounded-full text-white fog:text-caption-m leading-none",
          total && total > 0 ? "bg-brand-orange-500" : "bg-gray-200"
        )}
      >
        <span className="px-1">
          {total && total > 0 ? (
            <>
              {total} unread {total === 1 ? "room" : "rooms"}
            </>
          ) : (
            "No new messages"
          )}
        </span>
      </span>
      {asMention && <UnreadCircle total={total} asMention={true} className="fog:text-caption-m" />}
    </span>
  );
};

export const ThinButton: React.FC<{
  small?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  loading?: boolean;
  className?: string | undefined;
  colorClassName?: string | undefined;
}> = props => {
  const { small, onClick, disabled, loading, className, colorClassName } = props;
  return (
    <button
      onClick={disabled || loading ? undefined : onClick}
      className={classNames(
        `relative inline-block border rounded-md whitespace-nowrap uppercase leading-none`,
        `inline-flex justify-center items-center`,
        small ? "fog:text-caption-s px-2 py-1" : "fog:text-caption-m px-2 py-1",
        disabled
          ? "border-gray-200 text-gray-200 cursor-not-allowed"
          : colorClassName || "fog:text-ghost-link fog:box-ghost-link",
        (disabled || loading) && "cursor-not-allowed",
        className
      )}
    >
      <div className={classNames(loading ? "invisible" : "visible")}>{props.children}</div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-around">
          <Icons.SpinnerSmall />
        </div>
      )}
    </button>
  );
};

export const ThickButton: React.FC<{
  onClick?: () => void;
  loading?: boolean;
  small?: boolean;
  className?: string | undefined;
  disabled?: boolean;
}> = props => {
  const { onClick = () => undefined, loading, small, className, disabled } = props;
  return (
    <button
      className={classNames(
        "relative flex items-center justify-center rounded-lg text-white",
        disabled
          ? "bg-gray-200 cursor-not-allowed"
          : loading
          ? "bg-blue-500"
          : "bg-blue-500 hover:bg-blue-700",
        small ? "fog:text-button-s px-4 py-2.5" : "min-w-24 fog:text-button-m px-4 py-3.5",
        className
      )}
      onClick={disabled || loading ? undefined : onClick}
    >
      <div className={classNames(loading ? "invisible" : "visible")}>{props.children}</div>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-around">
          <span className={classNames(small ? "w-5 h-5" : "w-8 h-8")}>
            <Icons.Spinner className="w-full" />
          </span>
        </div>
      )}
    </button>
  );
};

export const LinkButton: React.FC<{
  onClick?: () => void;
  position?: "start" | "end" | undefined;
  className?: string;
}> = props => {
  const { onClick, position, className } = props;
  return (
    <button
      type="button"
      className={classNames(
        "flex items-center justify-center py-3.5 fog:text-button-m fog:text-link no-underline whitespace-nowrap",
        position === "start" ? "pr-4" : position === "end" ? "pl-4" : "px-4",
        className
      )}
      onClick={onClick}
    >
      <span
        className={classNames(
          position === "start" ? "-mr-4" : position === "end" ? "-ml-4" : undefined
        )}
      >
        {props.children}
      </span>
    </button>
  );
};

export const RosterChevronButton: React.FC<{
  isOpen?: boolean;
}> = ({ isOpen }) => {
  return (
    <div
      className={classNames(
        "w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-black transform transition",
        isOpen ? "-rotate-180" : "-rotate-90"
      )}
    >
      <Icons.Chevron className="w-3" />
    </div>
  );
};

type FilterInputProps = {
  value: string | undefined;
  setValue: (value: string) => void;
  placeholder?: string | undefined;
  addButton?: string;
  onAddButtonClick?: () => void;
  noBorder?: boolean;
  focusOnMount?: boolean;
  clearInputIconPosition?: "lead" | "trail";
  wrapperClassName?: string;
  isLoading?: boolean;
};

// export const FilterInput: React.FC<FilterInputProps> = ({
export const FilterInput = React.forwardRef<HTMLInputElement, FilterInputProps>(
  (
    {
      value,
      setValue,
      placeholder,
      addButton,
      onAddButtonClick,
      noBorder,
      focusOnMount,
      clearInputIconPosition = "lead",
      wrapperClassName,
      isLoading,
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useLayoutEffect(() => {
      if (focusOnMount) {
        inputRef?.current?.focus();
      }
    }, [focusOnMount]);

    const searchIconContent = (
      <span className="w-4 text-gray-500 cursor-pointer" onClick={() => inputRef?.current?.focus()}>
        <Icons.Search />
      </span>
    );

    const clearInputIconContent = (
      <span
        className="w-4 text-gray-500 cursor-pointer"
        onClick={() => {
          setValue("");
          inputRef?.current?.focus();
        }}
      >
        {isLoading === true ? <Icons.Spinner className="w-4" /> : <Icons.XCircleFilled />}
      </span>
    );

    const filterInput = (
      <div
        className={classNames(
          wrapperClassName,
          "relative flex items-center",
          noBorder !== true && "border-b border-gray-200"
        )}
        onClick={e => {
          e.stopPropagation();
        }}
      >
        {clearInputIconPosition === "lead" && value?.length
          ? clearInputIconContent
          : searchIconContent}

        <input
          type="text"
          ref={node => {
            inputRef.current = node;

            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          className="flex-1 px-2 py-3 bg-transparent outline-none text-black placeholder-gray-500 text-base sm:text-sm w-[98%]"
          placeholder={placeholder || "Search"}
          onChange={e => setValue(e.target.value)}
          value={value || ""}
          onKeyUp={e => {
            if (e.key === "Escape") {
              setValue("");
            }
          }}
        />

        {clearInputIconPosition === "trail" && !!value?.length && clearInputIconContent}

        {addButton && (
          <ThinButton onClick={onAddButtonClick} className="text-2xs" small={true}>
            {addButton}
          </ThinButton>
        )}
      </div>
    );

    return filterInput;
  }
);

export const ConnectionIssue: React.FC<{
  size?: "large" | "small";
  isConnected: boolean;
  isAuthenticated: boolean;
  isTokenWrong: boolean;
  disconnects: number | undefined;
}> = ({ size = "small", isConnected, isAuthenticated, isTokenWrong, disconnects }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    let t: any;
    if (!isConnected || !isAuthenticated) {
      setIsVisible(true);
    } else {
      t = setTimeout(() => setIsVisible(false), 3000);
    }
    return () => {
      clearTimeout(t);
    };
  }, [isConnected, isAuthenticated]);

  const showIssue = (disconnects !== undefined && disconnects > 0) || isTokenWrong;

  return (
    <div
      className={classNames(
        "p-1 flex flex-col rounded-full fog:box-shadow-m bg-white transform transition-all duration-1000",
        size === "small" ? "fog:text-body-m" : "fog:text-header3",
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "-translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center">
        {showIssue && (
          <span
            className={classNames(
              "flex items-center rounded-full bg-yellow-200 text-brand-red-500",
              size === "small" ? "py-1 px-2" : "py-2 px-4"
            )}
          >
            <span className={classNames(size === "small" ? "w-6" : "w-12")}>
              <Icons.LightningBolt className="w-full" />
            </span>
            <span>Connection issue</span>
          </span>
        )}
        <span className="flex-1 ml-4 mr-2">
          {isTokenWrong
            ? "Failed to sign in."
            : isConnected
            ? !isAuthenticated
              ? "Signin in..."
              : !disconnects
              ? "Connected"
              : "Reconnected"
            : !disconnects
            ? "Connecting..."
            : "Reconnecting..."}
        </span>
        {isTokenWrong && (
          <span className="fog:text-link" onClick={() => window.location.reload()}>
            Reload
          </span>
        )}
        <span className="flex items-center justify-end">
          {(!isConnected || !isAuthenticated) && !isTokenWrong && (
            <span className="mr-2 text-blue-500">
              <Icons.Spinner className={classNames(size === "small" ? "w-6" : "w-14")} />
            </span>
          )}
          {isConnected && isAuthenticated && !isTokenWrong && (
            <span
              className="mr-2 hover:text-brand-red-500 cursor-pointer"
              onClick={() => setIsVisible(false)}
            >
              <Icons.XClose className={classNames(size === "large" ? "w-12" : "w-6")} />
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

export const NotificationsPermissionRequest: React.FC<{
  isUser: boolean | undefined;
  vendorName: string | undefined;
  notificationsPermission?: NotificationPermission | "hide" | "request";
  setNotificationsPermission?: (
    notificationsPermission: NotificationPermission | "hide" | "request"
  ) => void;
}> = ({ isUser, vendorName, notificationsPermission, setNotificationsPermission }) => {
  if (notificationsPermission !== "default") {
    return null;
  }

  return (
    <div
      className={classNames(
        "p-1 flex flex-col rounded-3xl fog:box-shadow-m bg-yellow-50 text-black fog:text-body-m pointer-events-auto"
      )}
    >
      <div className="flex items-center">
        <span
          className="flex-1 ml-4 mr-2 cursor-pointer"
          onClick={e => {
            e.preventDefault();
            setNotificationsPermission?.("request");
          }}
        >
          {browser().name === "chrome" ? (
            <>
              <span className="block sm:inline">
                {isUser ? (
                  vendorName ? (
                    <span>{`${vendorName} Support`} needs your permission to enable </span>
                  ) : (
                    <span>We need your permission to enable </span>
                  )
                ) : (
                  <span>Fogbender needs your permission to enable </span>
                )}
                <span className="underline">desktop notifications</span>
              </span>
            </>
          ) : (
            <>
              <span className="font-bold">Click here</span>{" "}
              <span className="block sm:inline">
                to enable <span className="underline">desktop notifications</span>
              </span>
            </>
          )}
        </span>
        <span
          className="hover:text-brand-red-500 cursor-pointer"
          onClick={() => setNotificationsPermission?.("hide")}
        >
          <Icons.XClose />
        </span>
      </div>
    </div>
  );
};

export const CloseButton: React.FC<{ onClick: () => void; className?: "" | string }> = ({
  onClick,
  className,
}) => {
  const defaultPosition = "top-0 right-0 p-2 pt-1";
  const behavior = "absolute cursor-pointer transform rotate-45 text-2xl";

  return (
    <div className={className ? behavior + " " + className : defaultPosition + " " + behavior}>
      <span className="self-center" onClick={onClick}>
        +
      </span>
    </div>
  );
};

export const LoadingIndicator = ({ visible }: { visible: boolean }) => {
  return (
    <div
      className={classNames(
        "w-6 h-6 mx-auto my-1 flex-shrink-0 text-gray-500 pointer-events-none overflow-hidden",
        !visible && "invisible pointer-events-none"
      )}
    >
      {visible && <Icons.Spinner className="w-full h-full" />}
    </div>
  );
};

export const MessageCheckbox = ({ checked }: { checked: boolean }) => {
  return checked ? <Icons.MessageCheckboxOn /> : <Icons.MessageCheckboxOff />;
};

export const TabListWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="my-2 w-full md:w-auto flex flex-wrap items-center self-center">{children}</div>
  );
};

export const TabWrapper: React.FC<{ selected: boolean }> = ({ selected, children }) => {
  return (
    <div
      className={classNames(
        "flex-1 md:flex-none border-b-5 justify-center text-sm leading-5 px-6 py-2 text-center whitespace-nowrap cursor-pointer",
        selected
          ? "rounded-t-md border-brand-orange-500 text-black bg-blue-50"
          : "text-blue-700 border-gray-200 hover:text-red-500 hover:border-gray-300"
      )}
    >
      {children}
    </div>
  );
};

export const TabListHeaderWrapper = ({ children }: { children: React.ReactNode }) => {
  return <div className="w-full flex flex-col lg:flex-row lg:flex-wrap">{children}</div>;
};

export const TabHeaderWrapper: React.FC<{ selected: boolean }> = ({ selected, children }) => {
  return (
    <div
      className={classNames(
        "flex-1 lg:flex-none justify-center fog:text-header4 leading-5 px-0 lg:px-4 py-0 lg:py-3 my-2 lg:my-0 ml-4 lg:text-center max-w-min lg:max-w-max whitespace-nowrap cursor-pointer",
        selected
          ? "rounded-t-md border-brand-orange-500 text-black border-b-2 lg:border-b-5"
          : "text-blue-700 group-hover:text-red-500 border-b-2 lg:border-b-5 border-transparent"
      )}
    >
      {children}
    </div>
  );
};

export const BalloonTip = () => {
  return (
    <div className="filter drop-shadow-xl max-w-min ml-2.5">
      <svg
        width="30"
        height="14"
        viewBox="0 0 30 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13.8246 12.4177C11.9482 8.84016 7.68033 2.53102 0 0H30C22.3196 2.53054 18.0518 8.83999 16.1753 12.4177C15.7366 13.2541 14.2634 13.2541 13.8246 12.4177Z"
          fill="white"
        />
      </svg>
    </div>
  );
};

export const RadioIcon: React.FC<{ on: boolean; disabled?: boolean; className?: string }> = ({
  on,
  disabled,
  className,
}) => (
  <span className="text-blue-700">
    {on ? (
      disabled ? (
        <Icons.RadioFullDisabled className={className} />
      ) : (
        <Icons.RadioFull className={className} />
      )
    ) : disabled ? (
      <Icons.RadioEmptyDisabled className={className} />
    ) : (
      <Icons.RadioEmpty className={className} />
    )}
  </span>
);
