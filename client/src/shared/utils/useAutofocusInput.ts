import React from "react";

export const useAutoFocusInput = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  autoFocusDisabled: Boolean = false
) => {
  React.useEffect(() => {
    const onFocusInput = (e: KeyboardEvent) => {
      const currentTextArea = textareaRef?.current;

      const currentActiveElement = document.activeElement;

      const noInputIsFocused = currentActiveElement?.tagName !== "INPUT";

      const alreadyFocusedTextArea = currentTextArea?.isSameNode(currentActiveElement);

      // \w will match any alphanumeric character and underscore
      // \W will match any non-alphanumeric character
      const regx = new RegExp(/^[\w\W]$/, "g");

      if (
        currentTextArea &&
        noInputIsFocused &&
        !alreadyFocusedTextArea &&
        !autoFocusDisabled &&
        regx.test(e.key)
      ) {
        currentTextArea.focus();
      }
    };

    document.addEventListener("keydown", onFocusInput);

    return () => document.removeEventListener("keydown", onFocusInput);
  }, [textareaRef, autoFocusDisabled]);
};
