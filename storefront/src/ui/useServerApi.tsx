import React from "react";

import { getServerUrl } from "../config";

export function useServerApiGet<Data>(apiUrl?: string, selector?: any) {
  const baseUrl = getServerUrl();
  const url = apiUrl && baseUrl + apiUrl;
  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      if (!url) {
        return;
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.status === 200) {
        const data = await res.json();

        setError(null);
        setData(data);
        setLoading(false);
      } else {
        throw new Error(await res.text());
      }
    };
    fetchData().catch(err => {
      setError(err.toString());
      setLoading(false);
    });
  }, [url, selector]);

  return [loading, error, data] as const;
}

export function useServerApiDelete(apiUrl?: string) {
  const baseUrl = getServerUrl();
  const url = apiUrl && baseUrl + apiUrl;

  const [res, setRes] = React.useState<{
    error: Error | null;
    loading: boolean;
    success?: boolean;
  }>({ error: null, loading: false });

  const call = React.useCallback(() => {
    if (!url) {
      return;
    }

    setRes(prevState => ({ ...prevState, loading: true }));

    fetch(url, {
      method: "delete",
      credentials: "include",
    })
      .then(r => {
        if (r.status === 500) {
          throw new Error(`[${r.status}] ${r.statusText}`);
        } else {
          return r;
        }
      })
      .then(() => {
        setRes({ success: true, loading: false, error: null });
      })
      .catch(error => {
        setRes({ success: false, loading: false, error: error.toString() });
      });
  }, [url]);

  return [res, call] as const;
}

export function useServerApiPost<DataIn, DataOut = object>(apiUrl?: string, payload?: DataOut) {
  const baseUrl = getServerUrl();
  const url = apiUrl && baseUrl + apiUrl;

  const [res, setRes] = React.useState<{
    data: DataIn | null;
    error: Error | null;
    loading: boolean;
  }>({ data: null, error: null, loading: false });

  const call = React.useCallback(async () => {
    if (!url) {
      return Promise.resolve<void>(undefined);
    }

    setRes(prevState => ({ ...prevState, loading: true }));

    return fetch(url, {
      method: "post",
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then(r => {
        if (r.status === 500) {
          throw new Error(`[${r.status}] ${r.statusText}`);
        } else {
          return r;
        }
      })
      .then(r => {
        return r.status === 200 ? r.json() : r;
      })
      .then(r => {
        setRes({ data: r, loading: false, error: null });
      })
      .catch(error => {
        setRes({ data: null, loading: false, error: error.toString() });
      });
  }, [url, payload]);

  return [res, call] as const;
}

export async function fetchServerApiPost<DataIn, DataOut = object>(
  apiUrl: string,
  payload?: DataOut
) {
  return fetchServerApi<DataIn>(apiUrl, {
    method: "post",
    body: JSON.stringify(payload),
  });
}

export async function fetchServerApi<DataIn>(apiUrl: string, request: RequestInit) {
  const baseUrl = getServerUrl();
  const url = baseUrl + apiUrl;

  const res = await fetch(url, {
    ...request,
    credentials: "include",
  });

  if (res.status === 500) {
    throw new Error(`[${res.status}] ${res.statusText}`);
  } else {
    return res.status === 200 ? (res.json() as Promise<DataIn>) : res;
  }
}

export function useServerApiPostWithPayload<DataIn, DataOut>(apiUrl?: string) {
  const baseUrl = getServerUrl();
  const url = apiUrl && baseUrl + apiUrl;

  const [res, setRes] = React.useState<{
    data: DataIn | null;
    error: Error | null;
    loading: boolean;
  }>({ data: null, error: null, loading: false });

  const call = React.useCallback(
    (payload?: DataOut) => {
      if (!url) {
        return;
      }

      setRes(prevState => ({ ...prevState, loading: true }));

      fetch(url, {
        method: "post",
        credentials: "include",
        body: JSON.stringify(payload),
      })
        .then(r => {
          return r.status === 200 ? r.json() : r;
        })
        .then(async r => {
          if (r.ok === false) {
            const r1 = await r.json();
            setRes({ data: null, loading: false, error: r1.error });
          } else {
            setRes({ data: r, loading: false, error: null });
          }
        })
        .catch(error => {
          setRes({ data: null, loading: false, error: error.toString() });
        });
    },
    [url]
  );

  return [res, call] as const;
}

export function filterOutResponse<Data>(data: Data | Response): Data {
  if (data instanceof Response) {
    throw new Error("Expected to get 200 but instead got: " + data.statusText);
  } else {
    return data;
  }
}
