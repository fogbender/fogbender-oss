"use client";

import { useEffect, useState } from "react";
import {
  FogbenderSimpleWidget,
  type Token as FogbenderToken,
  FogbenderSimpleFloatie,
} from "fogbender-react";

export default function FogbenderWidget() {
  const clientUrl = "https://main--fb-client.netlify.app";
  const [token, setToken] = useState<FogbenderToken | null>(null);

  useEffect(() => {
    fetch("/fogbender-jwt")
      .then(res => res.json())
      .then(data => {
        const { userJWT } = data;
        setToken({
          widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
          customerId: "org123",
          customerName: "Customer Firm",
          userId: "example_PLEASE_CHANGE",
          userEmail: "user@example.com",
          userJWT,
          userName: "Customer User",
          userAvatarUrl:
            "https://fogbender-blog.s3.us-east-1.amazonaws.com/fogbender-cardinal-closeup.png",
        });
      })
      .catch(console.error);
  }, []);

  if (!token) {
    return null;
  }

  return <FogbenderSimpleFloatie clientUrl={clientUrl} token={token} />;
}
