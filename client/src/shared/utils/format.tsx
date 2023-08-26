import classNames from "classnames";
import dayjs from "dayjs";
import {
  EventIssue,
  EventRoom as Room,
  KnownCommsIntegrations,
  KnownIssueTrackerIntegrations,
  Tag,
} from "fogbender-proto";

import {
  IconAsana,
  IconGithub,
  IconGitlab,
  IconHeight,
  IconJira,
  IconLinear,
  IconMsTeams,
  IconSlack,
  IconTrello,
} from "../components/IntegrationIcons";
export const INTERNAL_CONVERASTIONS = "Internal conversations";
export const VISITOR_INBOX = "Visitor inbox";
export function isInternalHelpdesk(name?: string) {
  return name?.startsWith("$Cust_Internal") || false;
}

export function isExternalHelpdesk(name?: string) {
  return name?.startsWith("$Cust_External") || false;
}

export function isAnonymousHelpdesk(name?: string) {
  return name?.startsWith("$Cust_Anonymous") || false;
}

export function formatCustomerName(name?: string) {
  return isInternalHelpdesk(name)
    ? INTERNAL_CONVERASTIONS
    : isExternalHelpdesk(name)
    ? "Shared email inbox"
    : isAnonymousHelpdesk(name)
    ? VISITOR_INBOX
    : name;
}

export function formatRoomName(room: Room, isAgent: boolean, name?: string) {
  const isExternal = isExternalHelpdesk(room.customerName);
  const isAnonymous = isAnonymousHelpdesk(room.customerName);

  return !isAgent && (isAnonymous || isExternal)
    ? `Support conversation from ${dayjs(room.createdTs / 1000).format("MMM D h:mm a")}`
    : name || room.name;
}

type RenderTagOpts = {
  asLink: boolean;
  issueInfo?: EventIssue;
};

export const renderTag = (tag: Tag, opts: RenderTagOpts = { asLink: true }) => {
  return tag.name.startsWith(":") === true ? renderMeta(tag, opts) : `#${tag.name}`;
};

const renderMeta = (tag: Tag, opts: RenderTagOpts) => {
  if (tag.meta_type === "issue_tracker" && tag.meta_entity_type !== undefined) {
    if (KnownIssueTrackerIntegrations.includes(tag.meta_entity_type) === true) {
      return renderIntegrationMeta(tag);
    } else {
      return tag.name;
    }
  } else if (tag.meta_type === "issue" && tag.meta_entity_type !== undefined) {
    if (KnownIssueTrackerIntegrations.includes(tag.meta_entity_type) === true) {
      return renderIssueMeta(tag, opts);
    } else {
      return tag.name;
    }
  } else if (tag.meta_type === "comms" && tag.meta_entity_type !== undefined) {
    if (KnownCommsIntegrations.includes(tag.meta_entity_type) === true) {
      return renderCommsMeta(tag);
    } else {
      return tag.name;
    }
  } else {
    return tryRenderMeta(tag);
  }
};

const tryRenderMeta = (tag: Tag) => {
  const f = (name: string) => {
    return <div className="fog:text-link no-undefined leading-none">{name}</div>;
  };

  if (tag.meta_type === "status") {
    if (tag.name === ":open") {
      return f("Open");
    } else if (tag.name === ":closed") {
      return f("Closed");
    } else {
      return tag.name;
    }
  } else if (tag.name === ":status:open") {
    return f("Open");
  } else if (tag.name === ":status:closed") {
    return f("Closed");
  } else if (tag.name === ":priority:low") {
    return f("Priority: LOW");
  } else if (tag.name === ":priority:medium") {
    return f("Priority: MEDIUM");
  } else if (tag.name === ":priority:high") {
    return f("Priority: HIGH");
  } else {
    return tag.name;
  }
};

const renderIntegrationMeta = (tag: Tag) => {
  return tag.meta_entity_type !== undefined ? (
    <a
      className="fog:text-link no-underline leading-none"
      href={tag.meta_entity_url}
      target="_blank"
      rel="noopener"
    >
      <div className="inline-flex items-center gap-1.5 cursor-pointer" title={tag.meta_entity_url}>
        <div>{integrationIcon(tag.meta_entity_type)}</div>
        <div className="self-baseline">{tag.meta_entity_name}</div>
      </div>
    </a>
  ) : (
    tag.name
  );
};

const renderIssueMeta = (tag: Tag, opts: RenderTagOpts) => {
  const title =
    tag.meta_state === "closed"
      ? `${tag.meta_entity_name} (Closed)`
      : `${tag.meta_entity_name} (Open)`;

  const tagElement = tag.meta_entity_type ? (
    <div
      className={classNames(
        "inline-flex items-center gap-1.5",
        tag.meta_state === "closed" && "!line-through"
      )}
      title={title}
    >
      <div>{integrationIcon(tag.meta_entity_type)}</div>
      <div className="self-baseline">
        {isNaN(Number(tag.meta_entity_id)) === false && <span>#</span>}
        {tag.meta_entity_id}
      </div>
    </div>
  ) : null;

  return tag.meta_entity_type !== undefined ? (
    opts.asLink ? (
      <a
        className={classNames("fog:text-link no-underline leading-none")}
        href={tag.meta_entity_url}
        target="_blank"
        title={title}
        rel="noopener"
      >
        {tagElement}
      </a>
    ) : (
      tagElement
    )
  ) : (
    tag.name
  );
};

const renderCommsMeta = (tag: Tag) => {
  return tag.meta_entity_type !== undefined ? (
    <div className="inline-flex items-center gap-1.5 cursor-pointer" title={tag.meta_entity_url}>
      <div>{integrationIcon(tag.meta_entity_type)}</div>
      <div className="self-baseline">{tag.meta_entity_name} integration</div>
    </div>
  ) : (
    tag.name
  );
};

const integrationIcon = (type: string) => {
  if (type === "gitlab") {
    return <IconGitlab className="w-3 h-3" />;
  } else if (type === "github") {
    return <IconGithub className="w-3 h-3" />;
  } else if (type === "asana") {
    return <IconAsana className="w-3 h-3" />;
  } else if (type === "jira") {
    return <IconJira className="w-3 h-3" />;
  } else if (type === "linear") {
    return <IconLinear className="w-3 h-3" />;
  } else if (type === "height") {
    return <IconHeight className="w-3 h-3" />;
  } else if (type === "trello") {
    return <IconTrello className="w-3 h-3" />;
  } else if (type === "slack") {
    return <IconSlack className="w-6 h-6" />;
  } else if (type === "msteams") {
    return <IconMsTeams className="w-6 h-6" />;
  } else {
    return null;
  }
};
