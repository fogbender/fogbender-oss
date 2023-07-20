import { Avatar } from "fogbender-client/src/shared";
import React from "react";
import { useMutation, useQuery } from "react-query";

import { Workspace } from "../../redux/adminApi";
import { apiServer, queryClient, queryKeys } from "../client";

import { ExpandableSection } from "./ExpandableSection";

export const AvatarLibrary: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
  const avatarLibraries = [
    {
      id: "initials",
      name: "Initials",
      url: "https://avatars.dicebear.com/api/initials/",
    },
    {
      id: "avataars",
      name: "Avataars",
      url: "https://avatars.dicebear.com/api/avataaars/",
    },
    {
      id: "pixel-art",
      name: "Pixel Art",
      url: "https://avatars.dicebear.com/api/pixel-art/",
    },
    {
      id: "identicon",
      name: "Identicon",
      url: "https://avatars.dicebear.com/api/identicon/",
    },
    {
      id: "bottts",
      name: "Bottts",
      url: "https://avatars.dicebear.com/api/bottts/",
    },
  ];

  const { data: featureOptions } = useQuery(queryKeys.featureOptions(workspace.id), ({ signal }) =>
    apiServer
      .url(`/api/workspaces/${workspace.id}/feature_options`)
      .options({
        signal,
      })
      .get()
      .json<{ [id: string]: string | number }>()
  );

  const setAvatarLibraryUrlMutation = useMutation({
    mutationFn: (id: string) => {
      const l = avatarLibraries.find(l => l.id === id);

      return apiServer
        .url(`/api/workspaces/${workspace.id}/feature_options`)
        .post({
          featureOptions: {
            avatar_library_url: l?.url,
          },
        })
        .text();
    },
    onSettled: () => {
      queryClient.invalidateQueries(queryKeys.featureOptions(workspace.id));
    },
  });

  const selectedAvatarLibraryUrl = featureOptions?.avatar_library_url;

  return (
    <ExpandableSection title="User avatar library" expand={false}>
      <p className="my-4">
        If your customer user accounts don’t have profile pictures or avatars, Fogbender will
        auto-assign avatars from the library of your choice (below). Users will be able to change
        avatars within the chosen library, with the exception of <i>Initials</i>.
      </p>
      <div className="my-4">
        <form>
          <div className="flex flex-col gap-3">
            {avatarLibraries.map(l => (
              <Library
                key={l.id}
                id={l.id}
                name={l.name}
                url={l.url}
                checked={selectedAvatarLibraryUrl === l.url}
                onChange={v => setAvatarLibraryUrlMutation.mutate(v)}
              />
            ))}
          </div>
        </form>
      </div>

      <small>
        See{" "}
        <a href="https://avatars.dicebear.com/styles" target="_blank" rel="noopener">
          DiceBear Avatars
        </a>{" "}
        for more
      </small>
    </ExpandableSection>
  );
};

const Library: React.FC<{
  id: string;
  name: string;
  url: string;
  checked: boolean;
  onChange: (x: string) => void;
}> = ({ id, name, url, checked, onChange }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="radio"
          id={id}
          name="avatar-library"
          value={id}
          checked={checked}
          onChange={e => onChange(e.currentTarget.value)}
        />
        <label htmlFor={id}>
          <b>{name}</b>
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto">
        <Avatar imageSize={40} className="w-4" url={`${url}jimi-hendrix.svg`} />
        <Avatar imageSize={40} className="w-4" url={`${url}sharon-jones.svg`} />
        <Avatar imageSize={40} className="w-4" url={`${url}macy-gray.svg`} />
        <Avatar imageSize={40} className="w-4" url={`${url}tom-petty.svg`} />
        <Avatar imageSize={40} className="w-4" url={`${url}paul-mccartney.svg`} />
        <Avatar imageSize={40} className="w-4" url={`${url}john-lennon.svg`} />
        <Avatar imageSize={40} className="w-4" url={`${url}george-harrison.svg`} />
        <Avatar imageSize={40} className="w-4" url={`${url}ringo-starr.svg`} />
        <Avatar imageSize={40} className="w-4" url={`${url}neil-young.svg`} />
        <Avatar imageSize={40} className="w-4" url={`${url}willie-nelson.svg`} />
      </div>
    </div>
  );
};
