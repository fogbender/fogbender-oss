import { combineReducers } from "@reduxjs/toolkit";
import { useDispatch as useReduxDispatch } from "react-redux";
import { Dispatch } from "redux";

import { actionCreators as adminApiActionCreators, reducer as adminApi } from "./adminApi";
import { actionCreators as sessionActionsCreators, reducer as session } from "./session";

export const actionCreators = {
  ...sessionActionsCreators,
  ...adminApiActionCreators,
};

export type Action = ReturnType<(typeof actionCreators)[keyof typeof actionCreators]>;

export const rootReducer = combineReducers({ session, adminApi });
export type RootState = ReturnType<typeof rootReducer>;

export const useDispatch: () => Dispatch<Action> = useReduxDispatch;
