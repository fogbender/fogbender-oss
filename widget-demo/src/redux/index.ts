import { combineReducers } from "@reduxjs/toolkit";
import { useDispatch as useReduxDispatch } from "react-redux";
import type { Dispatch } from "redux";

import { actionCreators as fogbenderActionsCreators, reducer as fogbender } from "./fogbender";
import { actionCreators as issuesActionsCreators, reducer as issues } from "./issues";
import { actionCreators as messagesActionsCreators, reducer as messages } from "./messages";

export const actionCreators = {
  ...issuesActionsCreators,
  ...messagesActionsCreators,
  ...fogbenderActionsCreators,
};

export type Action = ReturnType<(typeof actionCreators)[keyof typeof actionCreators]>;

export const rootReducer = combineReducers({ issues, messages, fogbender });
export type RootState = ReturnType<typeof rootReducer>;

export const useDispatch: () => Dispatch<Action> = useReduxDispatch;
