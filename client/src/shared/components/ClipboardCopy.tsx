import classNames from "classnames";
import copy from "copy-to-clipboard";
import React from "react";

export const ClipboardCopy: React.FC<{
  text: string | undefined;
  className?: string;
  children: React.ReactNode;
  onCopy?: (text: string | undefined, result: boolean) => void;
  options?: {
    debug: boolean;
    message: string;
    format: string;
  };
}> = ({ text, children, onCopy, options, className }) => {
  const [textCopied, setTextCopied] = React.useState(false);
  React.useEffect(() => {
    if (textCopied) {
      const timer = setTimeout(() => {
        setTextCopied(false);
      }, 3000);
      () => clearTimeout(timer);
    }
  }, [textCopied]);

  const onClick = () => {
    const result = copy(text || "", options);
    if (onCopy) {
      onCopy(text, result);
    }
    setTextCopied(true);
  };

  return (
    <div
      onClick={onClick}
      className={classNames(
        className,
        "cursor-pointer",
        textCopied
          ? "text-green-500"
          : "text-gray-500 transition duration-100 ease-linear hover:text-red-500"
      )}
    >
      {children}
    </div>
  );
};
