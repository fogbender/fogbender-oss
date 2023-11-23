import classNames from "classnames";
import { Icons, muteSoundAtom, ThickButton } from "fogbender-client/src/shared";
import { type GetSettings, useWs } from "fogbender-proto";
import { useAtom } from "jotai";
import React from "react";
import { useMutation, useQuery } from "react-query";

const notificationFrequencies = [
  {
    id: "5-minutes",
    name: "Every 5 minutes",
    period: 5 * 60,
    enabled: true,
  },
  {
    id: "10-minutes",
    name: "Every 10 minutes",
    period: 10 * 60,
    enabled: true,
  },
  {
    id: "1-hour",
    name: "Every hour",
    period: 60 * 60,
    enabled: true,
  },
  {
    id: "everyday",
    name: "Once per day",
    period: 24 * 3600,
    enabled: true,
  },
  {
    id: "every-week",
    name: "Once per week",
    period: 7 * 24 * 3600,
    enabled: true,
  },
  {
    id: "never",
    name: "Never",
    period: 24 * 24 * 3600,
    enabled: false,
  },
];

export const EmailNotificationsSettings = ({
  workspaceId,
  userId,
  ourEmail,
}: {
  workspaceId?: string;
  userId?: string;
  ourEmail?: string;
}) => {
  const { serverCall } = useWs();

  const { data: featureOptions, refetch } = useQuery(
    ["notifications-id", workspaceId, userId],
    async () => {
      const res = await serverCall<GetSettings>({
        msgType: "Author.GetSettings",
        workspaceId: workspaceId !== undefined ? workspaceId : null,
      });
      if (res.msgType === "Author.Ok") {
        return res.settings;
      }
      return;
    }
  );

  const [settingNotificationFrequency, setSettingNotificationFrequency] = React.useState(false);

  const setNotificationFrequencyMutation = useMutation({
    mutationFn: ({ period, enabled }: (typeof notificationFrequencies)[number]) => {
      return serverCall({
        msgType: "Author.UpdateSettings",
        period,
        enabled,
        workspaceId: workspaceId !== undefined ? workspaceId : null,
      });
    },
    onSettled: () => {
      refetch();
      setTimeout(() => setSettingNotificationFrequency(false), 1000);
    },
  });

  const existingNotificationFrequency = featureOptions?.email_digest_period;
  const [isInFrequencyList, setIsInFrequencyList] = React.useState<boolean>();
  const isServerDefault = notificationFrequencies.find(
    e => e.period === existingNotificationFrequency
  );

  React.useEffect(() => {
    if (isServerDefault === undefined) {
      setIsInFrequencyList(false);
    } else {
      setIsInFrequencyList(true);
    }
  }, [isServerDefault]);

  const isEnabled = featureOptions?.email_digest_enabled;
  const [newPeriod, setNewPeriod] = React.useState<string>();

  const newNotificationFreq = React.useCallback((freq: string) => {
    setNewPeriod(freq);
    setIsInFrequencyList(true);
  }, []);

  const selectedFrequency = notificationFrequencies.find(e => e.id === newPeriod);

  const [muteSound, setMuteSound] = useAtom(muteSoundAtom);

  return (
    <div
      className={classNames(
        "flex flex-col gap-3 py-4 px-5 rounded-xl fog:box-shadow-m bg-white",
        "dark:bg-brand-dark-bg dark:text-white"
      )}
    >
      {userId && (
        <div
          className="text-blue-500 flex items-center gap-3 cursor-pointer"
          onClick={() => setMuteSound(x => !x)}
        >
          {muteSound ? <Icons.CheckboxOff className="w-5" /> : <Icons.CheckboxOn className="w-5" />}
          <span className="text-black dark:text-white">Sound notifications</span>
        </div>
      )}
      <div className="flex gap-3">
        {workspaceId && (
          <span className="flex flex-col">
            <span className="flex flex-col place-self-end">
              <Icons.Email />
            </span>
          </span>
        )}
        <span className="flex flex-col">
          {userId !== undefined ? (
            <span className="font-semibold">Email notification frequency</span>
          ) : (
            <div>
              <div className="flex-1 font-admin mt-1 text-3xl self-center">Email</div>
              <div className="mt-8 mb-2 font-semibold w-96">
                How often should we email{" "}
                <span className="font-bold text-gray-500">{ourEmail}</span> about new messages in
                this workspace?
              </div>
            </div>
          )}
          <div className="my-2">
            <form>
              <div className="flex flex-col gap-3">
                {notificationFrequencies.map(l => (
                  <Frequency
                    key={l.id}
                    id={l.id}
                    name={l.name}
                    period={l.period}
                    checked={
                      isEnabled === "false"
                        ? l.id === "never"
                        : newPeriod === undefined
                        ? existingNotificationFrequency === l.period
                        : newPeriod === l.id
                    }
                    onChange={newNotificationFreq}
                  />
                ))}
                {isInFrequencyList === false && featureOptions !== undefined && (
                  <Frequency
                    key={"server-default"}
                    id={"server-default"}
                    name={"Every " + featureOptions.email_digest_period + " seconds"}
                    period={60}
                    checked={isInFrequencyList === false}
                    onChange={newNotificationFreq}
                  />
                )}
              </div>
            </form>
          </div>
          <div>
            <ThickButton
              small={true}
              disabled={
                !selectedFrequency || existingNotificationFrequency === selectedFrequency.period
              }
              className="mt-3"
              loading={settingNotificationFrequency}
              onClick={() => {
                if (selectedFrequency) {
                  setSettingNotificationFrequency(true);
                  setNotificationFrequencyMutation.mutate(selectedFrequency);
                }
              }}
            >
              Apply
            </ThickButton>
          </div>
        </span>
      </div>
    </div>
  );
};

const Frequency: React.FC<{
  id: string;
  name: string;
  period: number;
  checked: boolean;
  onChange: (isServerDefault: string) => void;
}> = ({ id, checked, name, onChange }) => {
  return (
    <div
      className="cursor-pointer flex gap-3 items-center text-blue-500 dark:text-pink-900"
      onClick={() => onChange(id)}
    >
      {checked ? <Icons.RadioFull /> : <Icons.RadioEmpty />}
      <span className="text-black dark:text-white">{name}</span>
    </div>
  );
};
