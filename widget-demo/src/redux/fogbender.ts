import { createAction, createReducer } from "@reduxjs/toolkit";

import type { RootState } from ".";

type ReducerState = {
  showWidget: boolean;
};

export const actionCreators = {
  setShowWidget: createAction<{ show: boolean }, "SET_SHOW_WIDGET">("SET_SHOW_WIDGET"),
};

const initialState: ReducerState = {
  showWidget: true,
};

export const reducer = createReducer(initialState, builder => {
  builder.addCase(actionCreators.setShowWidget, (state, { payload: { show } }) => {
    state.showWidget = show;
  });
});

export const selectShowWidget = (state: RootState) => state.fogbender.showWidget;
