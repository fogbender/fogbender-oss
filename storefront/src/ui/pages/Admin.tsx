import { Provider } from "react-redux";

import { store } from "../../redux/store";
import { AdminWithProviders } from "../Admin";
import { RequireAuth } from "../RequireAuth";

export const AdminPage = () => {
  return (
    <Provider store={store}>
      <RequireAuth>
        <AdminWithProviders />
      </RequireAuth>
    </Provider>
  );
};
