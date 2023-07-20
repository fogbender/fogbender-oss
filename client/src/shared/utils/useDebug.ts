import React from "react";

import { updateDebug } from "../utils/debug";

export function useDebug(tag: string, object: any) {
  React.useEffect(() => {
    updateDebug(tag, () => object, undefined);
  }, [tag, object]);
}
