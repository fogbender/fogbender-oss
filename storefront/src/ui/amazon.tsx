import { Auth } from "@aws-amplify/auth";
import type { AuthOptions } from "@aws-amplify/auth/lib-esm/types/Auth";
import { Amplify } from "aws-amplify";
import { addDebug } from "fogbender-client/src/shared";

import { getCognitoPool } from "../config";

const authConfig: AuthOptions = getCognitoPool();

// https://docs.amplify.aws/lib/auth/start/q/platform/js#re-use-existing-authentication-resource
Amplify.configure({
  Auth: authConfig,
});

addDebug("Auth", Auth);

export { Auth };
