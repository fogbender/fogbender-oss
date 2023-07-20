import React from "react";

export function useNewMessagesAt({
  firstUnreadId,
  isActiveRoom,
}: {
  firstUnreadId: string | undefined;
  isActiveRoom: boolean;
}) {
  const [newMessagesAtId, setNewMessagesAtId] = React.useState<string>();
  const [newMessagesIsDimmed, setNewMessagesIsDimmed] = React.useState(false);

  React.useEffect(() => {
    setNewMessagesAtId(newMessagesAtId =>
      isActiveRoom && !newMessagesAtId
        ? firstUnreadId
        : !isActiveRoom && firstUnreadId
        ? firstUnreadId
        : newMessagesAtId
    );
    setNewMessagesIsDimmed(firstUnreadId === undefined);
  }, [isActiveRoom, firstUnreadId]);

  return { newMessagesAtId, newMessagesIsDimmed };
}
