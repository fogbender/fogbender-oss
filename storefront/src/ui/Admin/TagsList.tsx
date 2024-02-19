import { CreateTagForm, FilterInput, Modal, type Tag } from "fogbender-client/src/shared";
import React from "react";
import { useMutation, useQuery } from "react-query";

import { getServerUrl } from "../../config";
import { queryClient, queryKeys } from "../client";

import { ExpandableSection } from "./ExpandableSection";

const IconTag = () => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7 7H7.01M7 3H12C12.512 3 13.024 3.195 13.414 3.586L20.414 10.586C20.7889 10.9611 20.9996 11.4697 20.9996 12C20.9996 12.5303 20.7889 13.0389 20.414 13.414L13.414 20.414C13.0389 20.7889 12.5303 20.9996 12 20.9996C11.4697 20.9996 10.9611 20.7889 10.586 20.414L3.586 13.414C3.4 13.2285 3.25249 13.0081 3.15192 12.7655C3.05136 12.5228 2.99973 12.2627 3 12V7C3 5.93913 3.42143 4.92172 4.17157 4.17157C4.92172 3.42143 5.93913 3 7 3Z"
        stroke="#10B981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const TagsList: React.FC<{ designatedWorkspaceId: string | undefined }> = ({
  designatedWorkspaceId,
}) => {
  const { data: tags, isLoading: loadingTags } = useQuery<Tag[]>(
    queryKeys.tags(designatedWorkspaceId),
    () =>
      fetch(`${getServerUrl()}/api/workspaces/${designatedWorkspaceId}/tags`, {
        credentials: "include",
      }).then(res => res.json()),
    { enabled: designatedWorkspaceId !== undefined }
  );

  const [tagsFilter, setTagsFilter] = React.useState<string>();

  const filteredTags = React.useMemo(() => {
    const sortedTags = (tags || [])
      .concat()
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const systemTags = sortedTags.filter(x => x.name.startsWith(":"));
    const commonTags = sortedTags.filter(x => !x.name.startsWith(":"));
    const orderedTags = commonTags.concat(systemTags);
    if (!tagsFilter) {
      return orderedTags;
    }
    return orderedTags.filter(t => t.name.toLowerCase().includes(tagsFilter.toLowerCase()));
  }, [tagsFilter, tags]);

  const [createTag, setCreateTag] = React.useState(false);

  const addTagMutation = useMutation(
    (params: { name: string }) => {
      const { name } = params;
      return fetch(`${getServerUrl()}/api/workspaces/${designatedWorkspaceId}/tags`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ name }),
      });
    },
    {
      onSuccess: async r => {
        if (r.status === 204) {
          queryClient.invalidateQueries(queryKeys.tags(designatedWorkspaceId));
          setCreateTag(false);
        }
      },
    }
  );

  return (
    <div>
      <ExpandableSection title="Tags" expand={(tags || []).length > 0}>
        <FilterInput
          placeholder="Search tags"
          value={tagsFilter}
          setValue={setTagsFilter}
          addButton="CREATE NEW TAG"
          onAddButtonClick={() => setCreateTag(true)}
        />
        {!loadingTags && tags && (
          <div className="max-h-2/3 pt-2 pr-2 flex flex-col overflow-y-auto fbr-scrollbar">
            {filteredTags.map(t => (
              <div
                key={t.id}
                className="flex items-center py-2 px-1 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <span className="relative flex flex-1 w-full">
                  <div className="absolute left-0 top-0">
                    <IconTag />
                  </div>
                  <span className="flex-1 pl-8 truncate w-2/3 fog:text-caption-l">{t.name}</span>
                  <span className="fog:text-body-m">{t.id}</span>
                </span>
              </div>
            ))}
          </div>
        )}
        {createTag && (
          <Modal
            onClose={() => {
              setCreateTag(false);
            }}
          >
            <CreateTagForm
              initialValue={tagsFilter}
              nameOk={name => {
                return filteredTags.find(x => x.name === name) === undefined;
              }}
              onCreate={name => addTagMutation.mutate({ name })}
              creating={addTagMutation.isLoading}
            />
          </Modal>
        )}
      </ExpandableSection>
    </div>
  );
};
