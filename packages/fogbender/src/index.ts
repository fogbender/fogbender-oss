import { createFloatingWidget } from "./floatingWidget";
import type { Token, Badge, NewFogbenderType, Fogbender } from "./types";
export type { Token, Badge, NewFogbenderType, Fogbender };

export const createNewFogbender = (): NewFogbenderType => {
  const fogbender: NewFogbenderType = {
    async createFloatingWidget(rootEl, url, token) {
      createFloatingWidget(rootEl, url, token);
      return fogbender;
    },
  };
  return fogbender;
};
