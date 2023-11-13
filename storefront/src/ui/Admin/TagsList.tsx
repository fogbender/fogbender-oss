import { CreateTagForm, FilterInput, Modal, type Tag } from "fogbender-client/src/shared";
import React from "react";
import { useMutation, useQuery } from "react-query";

import IconTag from "../../assets/icon-tag.svg";
import { getServerUrl } from "../../config";
import { queryClient, queryKeys } from "../client";

import { ExpandableSection } from "./ExpandableSection";

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
                  <img src={IconTag.src} alt="Tag" className="absolute left-0 top-0" />
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
