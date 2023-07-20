import { bindActionCreators, configureStore } from "@reduxjs/toolkit";
import "@total-typescript/ts-reset";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import { actionCreators, rootReducer } from "./redux";
import AppBody from "./ui/AppBody";
import { AuthProvider } from "./ui/Auth";
import { Support } from "./ui/Support";

const store = configureStore({ reducer: rootReducer });

bindActionCreators(actionCreators, store.dispatch);

const App = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <Support headless={true} />
          <AppBody />
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
};

export default App;
