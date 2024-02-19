import { ChevronButton } from "fogbender-client/src/shared/ui/ChevronButton";
import React from "react";

import { FontAwesomeLink } from "../../shared/font-awesome/Link";

export const ExpandableSection: React.FC<{
  title: string;
  expand: boolean;
  hash?: string;
  anchor?: string;
  url?: string;
  count?: number;
  children?: React.ReactNode;
}> = ({ title, expand, hash, anchor, url, count, children }) => {
  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    setExpanded(expand);
  }, [expand]);

  const anchored = `#${anchor}` === hash;

  React.useEffect(() => {
    if (anchored && hash) {
      window.location.hash = "";
      window.location.hash = hash;
      setExpanded(true);
    }
  }, [anchored, hash]);

  return (
    <div
      id={anchor}
      className="fog:box-shadow-m rounded-xl bg-white dark:bg-brand-dark-bg dark:text-white py-4 px-5"
    >
      <h2 className="fog:text-header3 flex items-center justify-between">
        <span
          className="fog:text-link flex cursor-pointer items-center gap-4"
          onClick={() => setExpanded(expanded => !expanded)}
        >
          {url && (
            <a className="hidden" href={url} onClick={e => e.stopPropagation()}>
              <FontAwesomeLink className="fa-w-8 self-center text-gray-400 hover:text-red-600" />
            </a>
          )}
          <span>{title}</span>
          <div className="inline-block text-black">
            <ChevronButton isLarge={false} isOpen={expanded} />
          </div>
        </span>
        {count && <span className="text-base text-gray-500">{count}</span>}
      </h2>
      <div className={expanded ? "" : "hidden"}>{children}</div>
    </div>
  );
};
