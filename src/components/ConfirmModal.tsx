import React from "react";
import { IconX } from "@tabler/icons-react";
import cn from "../utils/cn";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  showCancel = true,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn p-8"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md glass-panel rounded-[48px] p-12 flex flex-col animate-slideUp shadow-huge"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all border border-white/5"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="text-sm text-gray-400 font-medium leading-relaxed mb-10 opacity-90">
          {message}
        </div>

        <div className="flex gap-4">
          {showCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-4 text-xs font-black tracking-widest uppercase bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 text-gray-300 active:scale-95"
            >{cancelText}</button>
          )}
          <button
            onClick={onConfirm}
            className={cn(
              "py-4 text-xs font-black tracking-widest uppercase bg-red-600 text-white hover:bg-red-500 rounded-2xl transition-all shadow-[0_4px_16px_rgba(220,38,38,0.3)] active:scale-95",
              showCancel ? "flex-1" : "w-full"
            )}
          >{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
