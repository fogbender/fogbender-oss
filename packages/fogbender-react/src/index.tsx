import * as React from "react";
import classNames from "classnames";
import type { Badge, Fogbender, Token } from "fogbender";

export { Badge, Fogbender, Token };

const handlers = {
  onBadges: (_badges: Badge[]) => {},
};

export function useFogbender(
  clientUrl: string,
  ref: HTMLDivElement | null,
  token: Token,
  headless = false
) {
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
      const w = window as typeof window & { Fogbender?: Fogbender };
      if (typeof w.Fogbender === "function") {
        w.Fogbender({
          rootEl: ref || undefined,
          url: clientUrl,
          token,
          headless,
          onBadges: badges => handlers.onBadges(badges),
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

export const FogbenderHeadless: React.FC<{
  clientUrl: string;
  token: Token;
}> = ({ clientUrl, token }) => {
  const divRef = React.useRef<HTMLDivElement>(null);
  useFogbender(clientUrl, divRef.current, token, true);
  return <div ref={divRef} />;
};

export const FogbenderBadge: React.FC<{ className?: string }> = ({ className }) => {
  const [howManyRoomsWithUnreads, setHowManyRoomsWithUnreads] = React.useState<number>();
  React.useEffect(() => {
    handlers.onBadges = badges => {
      const roomsWithUnreads = Object.values(badges).reduce((acc, b) => acc + b.count, 0);
      setHowManyRoomsWithUnreads(roomsWithUnreads);
    };
  }, []);

  return (
    <span
      className={classNames(
        "px-2 rounded-full text-xs font-extrabold",
        "bg-green-300 text-green-600",
        !howManyRoomsWithUnreads && "hidden",
        className !== undefined && className
      )}
    >
      {howManyRoomsWithUnreads}
    </span>
  );
};
