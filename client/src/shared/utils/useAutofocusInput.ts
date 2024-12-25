import React from "react";

export const useAutoFocusInput = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  autoFocusDisabled: Boolean = false
) => {
  React.useEffect(() => {
    const onFocusInput = (e: KeyboardEvent) => {
      const isCmdPressed = e.metaKey; // Cmd key on macOS

      const isCtrlPressed = e.ctrlKey; // Ctrl key on Windows/Linux

      const isCopyKey = e.key.toLowerCase() === "c";

      const tryToCopy = (isCmdPressed || isCtrlPressed) && isCopyKey;

      if (isCmdPressed || isCtrlPressed || tryToCopy) {
        // Do not trigger the action if the Ctrl or Cmd key is pressed alone, or in combination with 'C'.
        return;
      }

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
