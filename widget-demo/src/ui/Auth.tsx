import { NoAuthContext, NoAuthProvider } from "./NoAuth";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <NoAuthProvider>{children}</NoAuthProvider>;
};

export const AuthContext = NoAuthContext;
