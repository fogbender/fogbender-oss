import type React from "react";

import { ThickButton } from "./lib";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  title: string;
  hint?: string;
  buttonTitle?: string;
  onClose: () => void;
  onDelete: () => void;
  loading?: boolean;
  error?: string;
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  hint,
  buttonTitle,
  onClose,
  onDelete,
  loading,
  error,
  children,
}) => (
  <Modal onClose={onClose}>
    <div className="flex flex-col gap-6">
      <div className="font-admin mb-2 text-4xl font-bold">{title}</div>
      <div className="flex gap-3">{children}</div>
      <div className="flex items-center gap-8">
        <div className="width-12">
          <ThickButton onClick={onDelete} loading={loading}>
            {buttonTitle || "Delete"}
          </ThickButton>
        </div>
        <div className="fog:text-body-m">
          {error ? <div className="text-red-500">{error}</div> : <span>{hint}</span>}
        </div>
      </div>
    </div>
  </Modal>
);
