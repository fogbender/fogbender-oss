import { Avatar } from "fogbender-client/src/shared";
import React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { type Workspace } from "../../redux/adminApi";
import { apiServer, queryClient, queryKeys } from "../client";

import { ExpandableSection } from "./ExpandableSection";

export const AvatarLibrary: React.FC<{ workspace: Workspace }> = ({ workspace }) => {
  const avatarLibraries = [
    {
      id: "initials",
      name: "Initials",
      url: "https://api.dicebear.com/9.x/initials/svg?seed=",
    },
    {
      id: "avataars",
      name: "Avataars",
      url: "https://api.dicebear.com/9.x/avataaars/svg?seed=",
    },
    {
      id: "pixel-art",
      name: "Pixel Art",
      url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=",
    },
    {
      id: "personas",
      name: "Personas",
      url: "https://api.dicebear.com/9.x/personas/svg?seed=",
    },
    {
      id: "identicon",
      name: "Identicon",
      url: "https://api.dicebear.com/9.x/identicon/svg?seed=",
    },
    {
      id: "notionists",
      name: "Notionists",
      url: "https://api.dicebear.com/9.x/notionists/svg?seed=",
    },
  ];

  const { data: featureOptions } = useQuery({
    queryKey: queryKeys.featureOptions(workspace.id),
    queryFn: async ({ signal }) =>
      apiServer
        .url(`/api/workspaces/${workspace.id}/feature_options`)
        .options({
          signal,
        })
        .get()
        .json<{ [id: string]: string | number }>(),
  });

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
      queryClient.invalidateQueries({ queryKey: queryKeys.featureOptions(workspace.id) });
    },
  });

  const selectedAvatarLibraryUrl = featureOptions?.avatar_library_url as string | undefined;

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
                checked={
                  selectedAvatarLibraryUrl !== undefined &&
                  l.url.startsWith(selectedAvatarLibraryUrl)
                }
                onChange={v => setAvatarLibraryUrlMutation.mutate(v)}
              />
            ))}
          </div>
        </form>
      </div>

      <small>
        See{" "}
        <a href="https://www.dicebear.com/styles" target="_blank" rel="noopener">
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
        <Avatar imageSize={40} className="w-4" url={`${url}jimi-hendrix`} />
        <Avatar imageSize={40} className="w-4" url={`${url}sharon-jones`} />
        <Avatar imageSize={40} className="w-4" url={`${url}macy-gray`} />
        <Avatar imageSize={40} className="w-4" url={`${url}tom-petty`} />
        <Avatar imageSize={40} className="w-4" url={`${url}paul-mccartney`} />
        <Avatar imageSize={40} className="w-4" url={`${url}john-lennon`} />
        <Avatar imageSize={40} className="w-4" url={`${url}george-harrison`} />
        <Avatar imageSize={40} className="w-4" url={`${url}ringo-starr`} />
        <Avatar imageSize={40} className="w-4" url={`${url}neil-young`} />
        <Avatar imageSize={40} className="w-4" url={`${url}willie-nelson`} />
      </div>
    </div>
  );
};
