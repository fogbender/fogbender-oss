import React from "react";

const runStuffOnce = async (ctx: CTX) => {
  const [state, setState] = ctx;

  const update = async () => {
    if (localStorage.getItem("no_auth_login") === "true") {
      // go to server and sign this user userId with server secret
      // server checks that session is good and only returns signature for this user
      setState({
        ...state,
        isLoading: false,
        isAuthenticated: true,
        logout: async () => {
          localStorage.removeItem("no_auth_login");
          window.location.reload();
        },
      });
    } else {
      setState({
        ...state,
        isLoading: false,
        login: async () => {
          localStorage.setItem("no_auth_login", "true");
          await update();
        },
      });
    }
  };

  await update();
};

const auth0ContextValue = {
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
};

// eslint-disable-next-line react-hooks/rules-of-hooks
const ctxT = () => React.useState(auth0ContextValue);
type CTX = ReturnType<typeof ctxT>;

// https://upmostly.com/tutorials/how-to-use-the-usecontext-hook-in-react
export const NoAuthContext = React.createContext<CTX>([auth0ContextValue, () => {}]);

export const NoAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const ctx = React.useState(auth0ContextValue);
  React.useEffect(() => {
    runStuffOnce(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <NoAuthContext.Provider value={ctx}>{children}</NoAuthContext.Provider>;
};
