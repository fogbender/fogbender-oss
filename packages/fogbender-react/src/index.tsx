import * as React from "react";
import styles from "./styles.module.css";

interface Props {
  text: string;
}

export const ExampleComponent = ({ text }: Props) => {
  return <div className={styles.test}>Example Component: {text}</div>;
};

export type Token = {
  widgetId: string;
  customerExternalId: string;
  customerName: string;
  userExternalId: string;
  userName: string;
  userPicture?: string;
  userEmail?: string;
};

export function useFogbender(clientUrl: string, ref: HTMLDivElement | null, token: Token) {
  const onLoad = () => {
    setLoaded(true);
  };
  React.useEffect(() => {
    const script = document.createElement("script");

    script.src = `${clientUrl}/loader.js`;
    script.async = true;
    script.onload = onLoad;

    document.body.appendChild(script);
  }, []);
  const once = React.useRef(false);
  const [loaded, setLoaded] = React.useState(false);
  if (loaded) {
    if (once.current === false) {
      once.current = true;
      const w = window as typeof window & { Fogbender?: Function };
      if (typeof w.Fogbender === "function") {
        w.Fogbender({
          rootEl: ref,
          url: clientUrl,
          token,
        });
      }
    }
  }
}

export const FogbenderWidget: React.FC<{
  clientUrl: string;
  token: Token;
}> = ({ clientUrl, token }) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useFogbender(clientUrl, divRef.current, token);
  return <div ref={divRef} />;
};
