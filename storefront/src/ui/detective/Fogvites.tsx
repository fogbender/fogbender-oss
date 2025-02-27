import { type Fogvite } from "fogbender-client/src/shared";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getServerUrl } from "../../config";

export const FBRFogvites = () => {
  const { agentId } = useParams<"agentId">();
  if (!agentId) {
    return <>Please open /detective/fogvites/a00000000000000000000 instead</>;
  }
  return <Fogvites agentId={agentId} />;
};

const Fogvites: React.FC<{ agentId: string }> = ({ agentId }) => {
  const {
    isLoading: loading,
    error,
    data,
    refetch,
  } = useQuery<
    {
      id: string;
      name: string;
      my_fogvites: Fogvite[];
      fogvited: Fogvite[];
    },
    React.ReactNode // Error must be of type React.ReactNode in order to use it in JSX
  >({
    queryKey: ["fogvites"],
    queryFn: async () =>
      fetch(`${getServerUrl()}/detective_api/agents/${agentId}`, {
        credentials: "include",
        cache: "no-cache",
      }).then(res => res.json()),
  });
  const [deletedInvites, setDeletedInvites] = React.useState<string[]>([]);
  const fogvites =
    data?.my_fogvites.filter(d => !deletedInvites.includes(d.id) && d.deleted_at === null) || [];
  const fogvited =
    data?.fogvited.filter(d => !deletedInvites.includes(d.id) && d.deleted_at === null) || [];
  const hasFogvite = fogvited.length > 0;
  return (
    <div className="m-2 bg-gray-100">
      {loading && "loading"}
      {error && "error " + error}
      {data && (
        <>
          User {data.name} was {hasFogvite ? "fogvited" : "not fogvited"}
          {!hasFogvite && (
            <form
              onSubmit={e => {
                e.preventDefault();
                fetch(`${getServerUrl()}/detective_api/make_fogvited/${agentId}`, {
                  credentials: "include",
                  method: "POST",
                })
                  .then(res => res.json())
                  .catch(err => console.error(err))
                  .finally(() => refetch());
              }}
            >
              <button className="focus:shadow-outline ml-1 rounded bg-yellow-700 py-1 px-2 text-sm font-bold text-white shadow hover:bg-yellow-500 focus:outline-none">
                Make Fogvited
              </button>
            </form>
          )}
          <br />
          {fogvites.length === 0 ? (
            <>The user ({data.name}) has no fogvites</>
          ) : (
            <>
              <span>
                Fogvites for {data.name} ({fogvites.length} total, not sent:{" "}
                {fogvites.filter(f => f.invite_sent_to_email === null).length}, not accepted:{" "}
                {fogvites.filter(f => f.accepted_by_agent_id === null).length})
              </span>
            </>
          )}
          <br />
          <form
            onSubmit={e => {
              e.preventDefault();
              fetch(`${getServerUrl()}/detective_api/fogvites/${agentId}`, {
                credentials: "include",
                method: "POST",
              })
                .then(res => res.json())
                .catch(err => console.error(err))
                .finally(() => refetch());
            }}
          >
            <button className="focus:shadow-outline ml-1 rounded bg-yellow-700 py-1 px-2 text-sm font-bold text-white shadow hover:bg-yellow-500 focus:outline-none">
              Create 3 more fogvites
            </button>
          </form>
          <table className="table-auto border-separate" style={{ borderSpacing: 10 }}>
            <thead>
              <tr>
                <th className="px-4 py-2">delete</th>
                <th className="px-4 py-2">invite id</th>
                <th className="px-4 py-2">invite_sent_to_email</th>
                <th className="px-4 py-2">fogvite code</th>
                <th className="px-4 py-2">accepted_by_agent_id</th>
              </tr>
            </thead>
            <tbody>
              {fogvites.map(fogvite => (
                <tr key={fogvite.id}>
                  <td
                    className="cursor-pointer"
                    onClick={() => {
                      setDeletedInvites([...deletedInvites, fogvite.id]);
                      deleteFogvite(fogvite.id);
                    }}
                  >
                    delete
                  </td>
                  <td>{fogvite.id}</td>
                  <td>{fogvite.invite_sent_to_email}</td>
                  <td>{fogvite.fogvite_code}</td>
                  <td>{fogvite.accepted_by_agent_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <span>
            Note: once you delete an accepted fogvite this agent will no longer be able to create
            new organizations but will be able to send more invites if she had them.
          </span>
        </>
      )}
    </div>
  );
};

function deleteFogvite(id: string) {
  fetch(`${getServerUrl()}/detective_api/fogvites/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
    .then(data => {
      if (data.status !== 200) {
        throw new Error("failed to delete fogvite");
      }
    })
    .catch(e => {
      console.error(e);
      window.alert("failed to delete " + id);
      window.location.reload();
    });
}
