import { bindActionCreators, configureStore } from "@reduxjs/toolkit";
// import { addDebug } from "fogbender-client/src/shared";

import { actionCreators, rootReducer } from "./";

export const store = configureStore({ reducer: rootReducer });
// addDebug("store", store);

bindActionCreators(actionCreators, store.dispatch);
