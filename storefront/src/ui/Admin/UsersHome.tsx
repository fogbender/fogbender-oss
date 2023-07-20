import { Combobox } from "@headlessui/react";
import classNames from "classnames";
import {
  Avatar,
  Customer,
  FilterInput,
  Icons,
  Modal,
  Tag,
  ThickButton,
  ThinButton,
  XCircleFilled,
} from "fogbender-client/src/shared";
import React from "react";
import { useMutation, useQuery } from "react-query";

import { getServerUrl } from "../../config";
import { User } from "../../redux/adminApi";
import { queryClient, queryKeys } from "../client";

import { Tags } from "./CustomerDetails";

type UsersHomeProps = {
  customer: Customer;
};

function tagName(t: string) {
  return t.startsWith(":") ? t : `#${t}`;
}

export const UsersHome: React.FC<UsersHomeProps> = ({ customer }) => {
  const { data: workspaceTags } = useQuery<Tag[]>(
    queryKeys.tags(customer.workspaceId),
    () =>
      fetch(`${getServerUrl()}/api/workspaces/${customer.workspaceId}/tags`, {
        credentials: "include",
      }).then(res => res.json()),
    { enabled: customer !== undefined }
  );

  const { data: users, isLoading: loadingUsers } = useQuery<User[]>(
    queryKeys.users(customer.helpdeskId),
    () =>
      fetch(`${getServerUrl()}/api/helpdesks/${customer.helpdeskId}/users`, {
        credentials: "include",
      }).then(res => res.json()),
    { enabled: customer !== undefined }
  );

  const [usersFilter, setUsersFilter] = React.useState<string>();
  const filteredUsers = React.useMemo(() => {
    if (usersFilter && users) {
      const f = usersFilter.toLowerCase();
      return users.filter(
        u =>
          u.id.includes(f) ||
          u.name.toLowerCase().includes(f) ||
          u.email.toLowerCase().includes(f) ||
          u.external_uid.toLowerCase().includes(f) ||
          u.tags.find(t => t.name.toLowerCase().includes(f))
      );
    }
    return users;
  }, [users, usersFilter]);

  const [tagsFilter, setTagsFilter] = React.useState<string>();
  const filteredTags = React.useMemo(() => {
    if (tagsFilter !== undefined) {
      return (workspaceTags || []).filter(
        t => t.name.toLowerCase().includes(tagsFilter.toLowerCase()) && !t.name.startsWith(":")
      );
    }
    return workspaceTags;
  }, [workspaceTags, tagsFilter]);

  const [addTagMode, setAddTagMode] = React.useState(false);
  const [selectedTagsIds, setSelectedTagsIds] = React.useState<string[]>([]);
  const [selectedUsersIds, setSelectedUsersIds] = React.useState<string[]>([]);

  const allUsersAreSelected = users !== undefined && users.length === selectedUsersIds.length;

  const addTagsToUsersMutation = useMutation(
    (params: { userIds: string[]; tagsToAdd: string[] }) => {
      const { userIds, tagsToAdd } = params;
      return fetch(`${getServerUrl()}/api/helpdesks/${customer.helpdeskId}/users`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ userIds, tagsToAdd }),
      });
    },
    {
      onSuccess: async r => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.users(customer.helpdeskId));
          setSelectedUsersIds([]);
          setSelectedTagsIds([]);
        }
      },
    }
  );

  const toggleSelectAllUsers = React.useCallback(() => {
    if (users) {
      if (allUsersAreSelected) {
        setSelectedUsersIds([]);
      } else {
        setSelectedUsersIds(users.map(x => x.id));
      }
    }
  }, [users, allUsersAreSelected]);

  const toggleUser = React.useCallback(
    (userId: string) => {
      if (selectedUsersIds.includes(userId)) {
        setSelectedUsersIds(selectedUsersIds.filter(x => x !== userId));
      } else {
        setSelectedUsersIds([...selectedUsersIds, userId]);
      }
    },
    [selectedUsersIds]
  );

  const toggleTag = React.useCallback(
    (tagId: string) => {
      if (selectedTagsIds.includes(tagId)) {
        setSelectedTagsIds(selectedTagsIds.filter(x => x !== tagId));
      } else {
        setSelectedTagsIds([...selectedTagsIds, tagId]);
      }
    },
    [selectedTagsIds]
  );

  const applyTags = React.useCallback(() => {
    if (selectedUsersIds.length === 0 || selectedTagsIds.length === 0) {
      return;
    }

    addTagsToUsersMutation.mutate({ userIds: selectedUsersIds, tagsToAdd: selectedTagsIds });
  }, [addTagsToUsersMutation, selectedUsersIds, selectedTagsIds]);

  const thClassName = "p-1 pb-3 text-left align-middle";

  return (
    <div className="relative">
      <h3 className="fog:text-header3">Users</h3>
      <div className="mb-4">
        <FilterInput value={usersFilter} setValue={setUsersFilter} />
      </div>
      <div className={classNames("overflow-y-auto", "fbr-scrollbar")} style={{ maxHeight: "50vh" }}>
        <table className="w-full">
          <thead>
            <tr className="fog:text-caption-l">
              <th className="w-8 p-1 pb-3 text-left align-middle" onClick={toggleSelectAllUsers}>
                {!usersFilter && (
                  <span className="text-blue-500">
                    {allUsersAreSelected ? <Icons.CheckboxOn /> : <Icons.CheckboxOff />}
                  </span>
                )}
              </th>
              <th className={thClassName}>Name</th>
              <th className={thClassName}>Email</th>
              <th className={thClassName}>External ID</th>
              <th className={thClassName}>Tags</th>
            </tr>
          </thead>
          <tbody className="fog:text-body-m">
            {filteredUsers &&
              filteredUsers.map(user => (
                <UserRow
                  key={user.id}
                  user={user}
                  customer={customer}
                  selectedUsersIds={selectedUsersIds}
                  setAddTagMode={setAddTagMode}
                  toggleUser={toggleUser}
                />
              ))}
            {loadingUsers && (
              <tr>
                <td colSpan={3}>Loading...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {addTagMode && (
        <CreateTag
          tagsFilter={tagsFilter}
          filteredTags={filteredTags}
          selectedTagsIds={selectedTagsIds}
          toggleTag={toggleTag}
          applyTags={applyTags}
          setAddTagMode={setAddTagMode}
          setFilteredTag={setTagsFilter}
        />
      )}
    </div>
  );
};

const UserRow: React.FC<{
  user: User;
  customer: Customer;
  selectedUsersIds: string[];
  setAddTagMode: (value: boolean) => void;
  toggleUser: (userId: string) => void;
}> = ({ user, customer, selectedUsersIds, toggleUser, setAddTagMode }) => {
  const removeUserTagsMutation = useMutation(
    (params: { tagToRemove: string }) => {
      const { tagToRemove } = params;
      return fetch(`${getServerUrl()}/api/helpdesks/${customer.helpdeskId}/users/${user.id}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ tagToRemove }),
      });
    },
    {
      onSuccess: async r => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.users(customer.helpdeskId));
        }
      },
    }
  );

  return (
    <tr
      key={user.id}
      className="cursor-pointer hover:bg-gray-100"
      onClick={() => toggleUser(user.id)}
    >
      <td className="p-1 align-middle">
        <div className="flex items-center text-blue-500">
          {selectedUsersIds.includes(user.id) ? <Icons.CheckboxOn /> : <Icons.CheckboxOff />}
        </div>
      </td>
      <td className="p-1 align-middle">
        <div className="flex items-center gap-x-2">
          <Avatar size={32} url={user.avatar_url} name={user.name} />
          {user.name}
        </div>
      </td>
      <td className="p-1 align-middle">{user.email}</td>
      <td className="p-1 align-middle">{user.external_uid}</td>
      <td className="p-1 align-middle whitespace-nowrap">
        <span className="flex items-center space-x-2" onClick={e => e.stopPropagation()}>
          {user?.tags.map((t, i) => (
            <Tags
              key={i}
              text={tagName(t.name)}
              onCloseClick={() => {
                removeUserTagsMutation.mutate({ tagToRemove: t.id });
              }}
            />
          ))}
          <span className="relative">
            <ThinButton
              disabled={!selectedUsersIds.includes(user.id)}
              onClick={() => setAddTagMode(true)}
            >
              +
            </ThinButton>
          </span>
          {!user?.tags.length && (
            <span className="font-body font-semibold text-gray-300 text-xs">No Tags</span>
          )}
        </span>
      </td>
    </tr>
  );
};

const CreateTag = ({
  tagsFilter,
  filteredTags,
  selectedTagsIds,
  applyTags,
  toggleTag,
  setAddTagMode,
  setFilteredTag,
}: {
  tagsFilter: string | undefined;
  filteredTags: Tag[] | undefined;
  selectedTagsIds: string[];
  applyTags: () => void;
  setAddTagMode: (value: boolean) => void;
  setFilteredTag: (s: string | undefined) => void;
  toggleTag: (tagId: string) => void;
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <Modal onClose={() => setAddTagMode(false)}>
      <h2 className="fog:text-header2">Create Tag</h2>
      <Combobox multiple={true} value={[]}>
        <div className="-mt-2 px-2">
          <div className={classNames("flex border-b items-center")}>
            <Combobox.Label className="w-4 text-gray-500 cursor-pointer">
              {tagsFilter ? <XCircleFilled /> : <Icons.Search />}
            </Combobox.Label>
            <Combobox.Input
              ref={inputRef}
              className={
                "flex-1 px-2 py-3 bg-transparent outline-none text-black placeholder-gray-500 text-base sm:text-sm"
              }
              placeholder="Search Tags"
              onChange={evt => {
                setFilteredTag(evt.target.value);
              }}
            />
          </div>
        </div>
        <Combobox.Options
          onFocus={() => {
            inputRef.current?.focus();
          }}
          className="bg-white focus:outline-none"
        >
          {filteredTags?.map((tag, idx) => {
            return (
              <Combobox.Option
                className="my-2 px-3"
                key={idx}
                value={tag}
                onClick={() => toggleTag(tag.id)}
              >
                <div className="flex space-x-2 cursor-pointer items-center">
                  <span className="text-blue-500">
                    {selectedTagsIds.includes(tag.id) ? (
                      <Icons.CheckboxOn />
                    ) : (
                      <Icons.CheckboxOff />
                    )}
                  </span>
                  <span>{tag.name}</span>
                </div>
              </Combobox.Option>
            );
          })}
          {!filteredTags?.length && (
            <Combobox.Option value="No results. Try again?" disabled={true}>
              <div className={classNames("cursor-default px-4 py-3")}>No results. Try again?</div>
            </Combobox.Option>
          )}
        </Combobox.Options>
      </Combobox>
      {!!selectedTagsIds.length && (
        <div className="flex justify-end">
          <ThickButton onClick={applyTags}>Apply tags</ThickButton>
        </div>
      )}
    </Modal>
  );
};
