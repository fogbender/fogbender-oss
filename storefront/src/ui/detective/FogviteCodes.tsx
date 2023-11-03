import { type Fogvite } from "fogbender-client/src/shared";
import React from "react";
import { useQuery } from "react-query";
import { Link, useParams } from "react-router-dom";

import { getServerUrl } from "../../config";

type FogviteCode = {
  code: string;
  limit: number;
  disabled: boolean;
};

export const FogviteCodes = () => {
  return <Fogvites />;
};

const Fogvites: React.FC<{}> = () => {
  const {
    isLoading: loading,
    error,
    data,
    refetch,
  } = useQuery<FogviteCode[]>("fogviteCodes", () =>
    fetch(`${getServerUrl()}/detective_api/fogvite_codes`, {
      credentials: "include",
    }).then(res => res.json())
  );

  const { codeId } = useParams<"codeId">();

  const { data: invites } = useQuery<Fogvite[]>(["invites", codeId], () =>
    fetch(`${getServerUrl()}/detective_api/fogvite_codes/${codeId}`, {
      credentials: "include",
    }).then(res => res.json())
  );

  const formRef = React.useRef<HTMLFormElement>(null);
  const [editingCode, setEditingCode] = React.useState<string | undefined>();
  return (
    <div className="m-2 bg-gray-100 p-2">
      {loading && "loading"}
      {error && "error " + error}
      {data && (
        <>
          <form
            ref={formRef}
            className=""
            onSubmit={e => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const code = data.get("code");
              const limit = data.get("limit");
              const enabled = data.get("enabled");
              if (typeof code === "string" && typeof limit === "string") {
                postForviteCode({
                  code,
                  limit: parseInt(limit || "10", 10),
                  disabled: enabled !== "on",
                })
                  .catch(e => {
                    console.error(e);
                  })
                  .finally(() => {
                    setEditingCode(code);
                    refetch();
                  });
              }
            }}
          >
            {editingCode === undefined ? "Add new code" : "Update existing code"}:
            <br />
            <input
              name="code"
              className="border border-gray-500"
              type="text"
              placeholder="code"
              onChange={e => {
                const code = e.currentTarget.value;
                setEditingCode(data.some(d => d.code === code) ? code : undefined);
              }}
            />
            <input
              name="limit"
              className="ml-2 border border-gray-500"
              type="number"
              defaultValue={10}
              placeholder="10"
            />
            <input
              name="enabled"
              className="ml-2 border border-gray-500"
              type="checkbox"
              defaultChecked={true}
            />
            <button
              type="submit"
              className="ml-2 border bg-gray-300 px-2 text-black"
              value="Submit"
            >
              {editingCode === undefined ? "Create" : "Update"}
            </button>
          </form>
          <br />
          <div className="flex flex-wrap space-x-2">
            <div>
              Existing codes:
              <table className="table-auto border-separate" style={{ borderSpacing: 10 }}>
                <thead>
                  <tr>
                    <th className="px-4 py-2">action</th>
                    <th className="px-4 py-2">code</th>
                    <th className="px-4 py-2">limit</th>
                    <th className="px-4 py-2">invites</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(fogviteCode => (
                    <tr
                      key={fogviteCode.code}
                      className={editingCode === fogviteCode.code ? "bg-yellow-200" : ""}
                    >
                      <td
                        className="cursor-pointer"
                        onClick={() => {
                          formRef.current?.reset();
                          const code = formRef.current?.querySelector("input[name=code]");
                          const limit = formRef.current?.querySelector("input[name=limit]");
                          const enabled = formRef.current?.querySelector("input[name=enabled]");
                          if (
                            code instanceof HTMLInputElement &&
                            limit instanceof HTMLInputElement &&
                            enabled instanceof HTMLInputElement
                          ) {
                            code.value = fogviteCode.code;
                            limit.value = fogviteCode.limit.toString();
                            enabled.checked = !fogviteCode.disabled;
                            setEditingCode(fogviteCode.code);
                          }
                        }}
                      >
                        edit
                      </td>
                      <td className={fogviteCode.disabled ? "line-through" : ""}>
                        {fogviteCode.code}
                      </td>
                      <td>{fogviteCode.limit}</td>
                      <td>
                        <Link to={"./" + fogviteCode.code}>see</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-300">
              Invites ({invites?.length}):
              <table className="table-auto border-separate" style={{ borderSpacing: 10 }}>
                <thead>
                  <tr>
                    <th className="px-4 py-2">agent_id</th>
                  </tr>
                </thead>
                <tbody>
                  {invites?.map(fogvite => (
                    <tr key={fogvite.id}>
                      <td className={fogvite.deleted_at ? "line-through" : ""}>
                        {fogvite.accepted_by_agent_id}
                      </td>
                      <td>
                        <Link to={"/detective/fogvites/" + fogvite.accepted_by_agent_id}>
                          see invites
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function postForviteCode(code: FogviteCode) {
  return fetch(`${getServerUrl()}/detective_api/fogvite_codes`, {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(code),
  }).then(data => {
    if (data.status !== 200) {
      throw new Error("failed to update fogvite code");
    }
  });
}
