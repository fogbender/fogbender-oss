import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { type RenderUsersInfoCb } from "fogbender-client/src/shared/app/UsersInfo";
import { ClipboardCopy } from "fogbender-client/src/shared/components/ClipboardCopy";
import { Clipboard } from "fogbender-client/src/shared/components/Icons";
import { type Room } from "fogbender-proto";
import React from "react";
import { useQuery } from "react-query";

import { type User } from "../../redux/adminApi";
import { apiServer, queryKeys } from "../client";
// import { Link } from "react-router-dom";

dayjs.extend(relativeTime);

type ApolloOrganization = {
  industry: string;
  name: string;
  website_url: string;
};

type Apollo = {
  email: string;
  title: string;
  name: string;
  city: string;
  state: string;
  organization: ApolloOrganization;
};

type GeoapifyCity = {
  name: string;
};

type GeoapifyCountry = {
  name: string;
};

type GeoapifyLocation = {
  latitude: number;
  longitude: number;
};

type Geoapify = {
  ip: string;
  city: GeoapifyCity;
  country: GeoapifyCountry;
  location: GeoapifyLocation;
};

type Headers = {
  origin: string;
  visitUrl: string;
};

type UserInfo = {
  user: User;
  apollo: Apollo;
  geoapify: Geoapify;
  headers: Headers;
};

export const UsersInfoPane: React.FC<Parameters<RenderUsersInfoCb>[0]> = ({ room }) => {
  const users = room.members?.filter(m => m.type === "user" && !!m.email) || [];

  return (
    <div className="mt-2 text-sm flex flex-col gap-3">
      {users.map(u => (
        <UserDetails key={u.id} userId={u.id} room={room} />
      ))}
    </div>
  );
};

const UserDetails = ({ userId, room }: { userId: string; room: Room }) => {
  const { data: userInfo } = useQuery({
    queryKey: queryKeys.userInfo(userId || "N/A"),
    queryFn: () =>
      apiServer.get(`/api/helpdesks/${room.helpdeskId}/intel/users/${userId}`).json<UserInfo>(),
    enabled: !!userId,
  });

  const visitUrl = userInfo?.headers?.visitUrl;

  const email = userInfo?.apollo?.email;
  const name = userInfo?.apollo?.name;
  const title = userInfo?.apollo?.title;
  const orgName = userInfo?.apollo?.organization?.name;
  const orgUrl = userInfo?.apollo?.organization?.website_url;

  const ip = userInfo?.geoapify?.ip;
  const latitude = userInfo?.geoapify?.location?.latitude;
  const longitude = userInfo?.geoapify?.location?.longitude;
  const gMapUrl =
    latitude &&
    longitude &&
    `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const visitorCity = userInfo?.geoapify?.city?.name;
  const visitorCountry = userInfo?.geoapify?.country?.name;

  const userInsertedAt = userInfo?.user?.inserted_at;
  const userLastActivityAt = userInfo?.user?.last_activity_at;
  const userName = userInfo?.user?.name;
  const userEmailVerified = userInfo?.user?.email_verified;

  return (
    <div className="p-2 bg-amber-50 dark:bg-brand-dark-bg dark:text-white rounded border flex flex-col">
      <span className="font-medium">
        <Clipboardable content={userName} />
      </span>

      {userEmailVerified && (
        <>
          <hr className="my-2" />
          {email === undefined && <span className="italic">Email enrichment info unavailable</span>}
          <Clipboardable content={email} />
          <Clipboardable content={name} />
          <Clipboardable content={title} />
          <Clipboardable content={orgName} />
          <Clipboardable content={orgUrl} url={orgUrl} />
        </>
      )}

      <hr className="my-2" />

      <Clipboardable content={ip} />

      {gMapUrl && visitorCity && visitorCountry && (
        <Clipboardable content={`${visitorCity}, ${visitorCountry}`} url={gMapUrl} />
      )}

      <Clipboardable content={visitUrl} />

      {userInsertedAt && <span>First seen {dayjs(userInsertedAt).fromNow()}</span>}

      {userLastActivityAt && <span>Last active {dayjs(userLastActivityAt).fromNow()}</span>}
    </div>
  );
};

const Clipboardable = ({ content, url }: { content: string | undefined; url?: string }) => {
  return content ? (
    <div className="flex gap-x-2 items-center">
      <ClipboardCopy text={content}>
        <Clipboard className="w-3" />
      </ClipboardCopy>
      {url ? (
        <a className="fog:text-link" target="_blank" rel="noopener" href={url}>
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  ) : null;
};
