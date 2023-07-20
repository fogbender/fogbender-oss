import { createAction, createReducer, createSelector } from "@reduxjs/toolkit";

import type { RootState } from ".";

type Issue = {
  id: string;
  name: string;
  open?: boolean;
  following?: boolean;
};

export type IssueFilter = "open" | "following" | "all";

type ReducerState = {
  issues: Issue[];
  currentIssueId: string;
  currentIssueFilter: IssueFilter;
};

export const actionCreators = {
  setCurrentIssue: createAction<{ id: string }, "SET_CURRENT_ISSUE">("SET_CURRENT_ISSUE"),
  setCurrentIssueFilter: createAction<{ filter: IssueFilter }, "SET_CURRENT_ISSUE_FILTER">(
    "SET_CURRENT_ISSUE_FILTER"
  ),
};

const initialState: ReducerState = {
  issues: [
    { id: "triage", name: "Triage", open: true, following: true },
    { id: "1", name: "Outage 7/1/2019", open: true },
    { id: "2", name: "testtesttest", open: true },
    { id: "3", name: "Object properties save fail", following: true },
    { id: "4", name: "db2 instance issue" },
  ],
  currentIssueId: "triage",
  currentIssueFilter: "open",
};

export const reducer = createReducer(initialState, builder => {
  builder
    .addCase(actionCreators.setCurrentIssue, (state, { payload: { id } }) => {
      state.currentIssueId = id;
    })
    .addCase(actionCreators.setCurrentIssueFilter, (state, { payload: { filter } }) => {
      state.currentIssueFilter = filter;
    });
});

function issueFilterFn(issue: Issue, filter: IssueFilter) {
  switch (filter) {
    case "open":
      return issue.open === true;
    case "following":
      return issue.following === true;
    case "all":
      return true;
  }
}

export const selectIssues = (state: RootState) => state.issues.issues;

export const selectFilteredIssues = (state: RootState) =>
  state.issues.issues.filter(x => issueFilterFn(x, state.issues.currentIssueFilter));

export const selectCurrentIssueId = (state: RootState) => state.issues.currentIssueId;
export const selectCurrentIssueFilter = (state: RootState) => state.issues.currentIssueFilter;

export const selectCurrentIssue = createSelector(
  selectIssues,
  selectCurrentIssueId,
  (issues, id) => issues.find(x => x.id === id) ?? { id: "0", name: "<unknown issue>" }
);
