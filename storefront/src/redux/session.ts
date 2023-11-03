import { createAction, createReducer } from "@reduxjs/toolkit";
import { type AuthorMe, LocalStorageKeys, SafeLocalStorage, type UserMe } from "fogbender-client/src/shared";

import type { RootState } from ".";

export const actionCreators = {
  setUser: createAction<{ user: UserMe | null }, "SET_USER">("SET_USER"),
  designateVendorId: createAction<string | null, "DESIGNATE_VENDOR_ID">("DESIGNATE_VENDOR_ID"),
  designateWorkspaceId: createAction<string | null, "DESIGNATE_WORKSPACE_ID">(
    "DESIGNATE_WORKSPACE_ID"
  ),
  setFogbenderWidgetId: createAction<string, "SET_FOGBENDER_WIDGET_ID">("SET_FOGBENDER_WIDGET_ID"),
};

type ReducerState = {
  isSignedOut: boolean;
  user?: UserMe;
  authorMe?: AuthorMe | undefined;
  designatedVendorId?: string;
  designatedWorkspaceId?: string;
  fogbenderWidgetId?: string;
};

const initialState: ReducerState = {
  isSignedOut: "true" !== SafeLocalStorage.getItem(LocalStorageKeys.HadLogin),
  user: undefined,
};

export const reducer = createReducer(initialState, builder => {
  builder.addCase(actionCreators.setUser, (state, action) => {
    const { user } = action.payload;
    if (user) {
      state.user = user;
      state.authorMe = {
        name: user.name,
        email: user.email,
        avatarUrl: user.image_url,
      };
      state.isSignedOut = false;
    } else {
      state.user = undefined;
      state.authorMe = undefined;
      state.isSignedOut = true;
    }
  });

  builder.addCase(actionCreators.designateVendorId, (state, action) => {
    const id = action.payload || undefined;
    state.designatedVendorId = id;

    if (id === undefined) {
      state.designatedWorkspaceId = undefined;
    }

    if (id) {
      SafeLocalStorage.setItem(LocalStorageKeys.DesignatedVendorId, id);
      SafeLocalStorage.removeItem(LocalStorageKeys.DesignatedWorkspaceId);
      state.designatedWorkspaceId = undefined;
    }
  });

  builder.addCase(actionCreators.designateWorkspaceId, (state, action) => {
    const id = action.payload || undefined;
    state.designatedWorkspaceId = id;

    if (id) {
      SafeLocalStorage.setItem(LocalStorageKeys.DesignatedWorkspaceId, id);
    }
  });

  builder.addCase(actionCreators.setFogbenderWidgetId, (state, action) => {
    state.fogbenderWidgetId = action.payload;
  });
});

export const getIsSignedOut = (state: RootState) => !!state.session.isSignedOut;

export const getIsAuthorized = (state: RootState) => !!state.session.user?.id;

export const getAuthenticatedAgentId = (state: RootState) => state.session.user?.id;

export const selectUserName = (state: RootState) => state.session.user?.name || "<unknown>";

export const selectUserImageUrl = (state: RootState) => state.session.user?.image_url;

export const selectUser = (state: RootState) => state.session.user;
export const selectAuthorMe = (state: RootState) => state.session.authorMe;

export const selectDesignatedVendorId = (state: RootState) => state.session.designatedVendorId;
export const selectDesignatedWorkspaceId = (state: RootState) =>
  state.session.designatedWorkspaceId;

export const selectFogbenderWidgetId = (state: RootState) => state.session.fogbenderWidgetId;
