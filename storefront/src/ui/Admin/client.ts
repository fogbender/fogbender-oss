import { type Client } from "fogbender-client/src/shared";

import { defaultEnv } from "../../config";

export const client: Client = {
  getEnv: () => defaultEnv,
};
