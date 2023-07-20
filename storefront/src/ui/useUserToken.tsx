import type { UserToken } from "fogbender-proto";
import { useSelector } from "react-redux";

import { selectFogbenderWidgetId, selectUser } from "../redux/session";

import { useFogbenderVendor } from "./useSessionApi";
import { useVendorById } from "./useVendor";

export function useUserToken(vendorId: string | undefined) {
  const user = useSelector(selectUser);

  const vendor = useVendorById(vendorId);
  const vendorName = vendor?.name;

  const [loading, done] = useFogbenderVendor();

  const widgetId = useSelector(selectFogbenderWidgetId);

  if (vendor && user && widgetId && vendorId) {
    const token: UserToken = {
      widgetId,
      customerId: vendorId,
      customerName: vendorName || "<unknown>",
      userId: user.id,
      userName: user.name,
      userAvatarUrl: user.image_url,
      userEmail: user.email,
      userHMAC: user.widget_hmac,
      userPaseto: user.widget_paseto,
      userJWT: user.widget_jwt,
    };

    return { token, loading, done, widgetId };
  } else {
    return { token: undefined, loading, done, widgetId };
  }
}
