import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";

import type { RootState } from ".";

export type Message = {
  author: {
    name: string;
    avatarUrl?: string;
    isAgent?: boolean;
  };
  parsed: string;
  isPinned?: boolean;
};

export const actionCreators = {
  sendMessage: createAction<
    { issue: string; userName: string; userPicture?: string; text: string },
    "SEND_MESSAGE"
  >("SEND_MESSAGE"),
  deleteLastMessage: createAction<{ issue: string }, "DELETE_MESSAGE">("DELETE_MESSAGE"),
};

type ReducerState = {
  byIssue: { [key: string]: Message[] };
};

const initialState: ReducerState = {
  byIssue: {
    triage: [
      {
        author: {
          name: "Eusebio Mcclure",
          isAgent: true,
        },
        parsed: `<p>Welcome! Please take a look at the active issues on the left and see if there is one matching yours. If not, please start a new conversation here, in Triage.</p>`,
        isPinned: true,
      },
      {
        author: {
          name: "Amelia Earhart",
        },
        parsed: `<p>Does anyone know how to add admins? I tried, but it’s not working for me... </p>`,
      },
      {
        author: {
          name: "Bessie Coleman",
          isAgent: true,
        },
        parsed: `<p>Hi Amelia -- you’ll have ask <b>@Mary Riddle</b> to either grant you admin priviledges, or invite the new user on your behalf.</p>`,
      },
      {
        author: {
          name: "Bessie Coleman",
          isAgent: true,
        },
        parsed: `<p>Please let me know if you can’t get a hold of Mary.</p>`,
      },
      {
        author: {
          name: "Mary Riddle",
          isAgent: true,
        },
        parsed: `<p><b>@Amelia Earhart</b> made you admin. Lmk if not working as expected...</p>`,
      },
      {
        author: {
          name: "Mary Riddle",
          isAgent: true,
        },
        parsed: `<p>BTW, <b>@Bessie Coleman</b> what happens if none of our admins are avaialable?</p>`,
      },
    ],

    "1": [
      {
        author: {
          name: "Amelia Earhart",
        },
        parsed: `<p>Nothing is working at all! Please help!!!</p>`,
        isPinned: true,
      },
      {
        author: {
          name: "Amelia Earhart",
        },
        parsed: `<p>HELP!</p>`,
      },
      {
        author: {
          name: "Mary Riddle",
          isAgent: true,
        },
        parsed: `<p>Sorry missed the message!</p>`,
      },
    ],

    "2": [
      {
        author: {
          name: "Eusebio Mcclure",
          isAgent: true,
        },
        parsed: `<p>test</p>`,
      },
      {
        author: {
          name: "Eusebio Mcclure",
          isAgent: true,
        },
        parsed: `<p>test test</p>`,
      },
    ],
  },
};

export const reducer = createReducer(initialState, builder => {
  builder
    .addCase(actionCreators.sendMessage, (state, action) => {
      const { issue, userName, userPicture, text } = action.payload;
      if (!state.byIssue[issue]) {
        state.byIssue[issue] = [];
      }
      state.byIssue[issue]?.push({
        author: { name: userName, avatarUrl: userPicture },
        parsed: `<p>${text}</p>`,
      });
    })
    .addCase(actionCreators.deleteLastMessage, (state, action) => {
      const { issue } = action.payload;
      state.byIssue[issue]?.pop();
    });
});

export const selectMessagesByIssue = (state: RootState, issue: string) =>
  state.messages.byIssue[issue] ?? [];

export const selectPinnedMessagesByIssue = createSelector(selectMessagesByIssue, messages =>
  messages.filter(x => x.isPinned === true)
);
