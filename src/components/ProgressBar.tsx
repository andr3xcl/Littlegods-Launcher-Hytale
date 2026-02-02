import { formatBytes } from "../utils/formatNum";
import cn from "../utils/cn";

interface Props {
  progress: InstallProgress;
  className?: string;
}

const PHASES: Record<string, string> = {
  "pwr-download": "Downloading...",
  patching: "Extracting...",
  "online-patch": "Patching Online System",
  "fix-download": "Downloading Fix...",
  "fix-extract": "Patching Fix...",
  "jre-download": "Downloading JRE...",
  "jre-extract": "Extracting JRE...",
};

export default function ProgressBar({ progress, className }: Props) {
  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-[var(--color-fg-muted)] font-black uppercase tracking-widest">
          {PHASES[progress.phase]}
        </div>
        {progress.percent > -1 && (
          <div className="text-[10px] font-bold text-[var(--color-accent-fg)] font-mono">{progress.percent}%</div>
        )}
      </div>

      <div className="relative h-1.5 overflow-hidden bg-white/5 rounded-full border border-white/5">
        <div
          className={cn(
            "h-full bg-[var(--color-accent-emphasis)] rounded-full shadow-[0_0_10px_var(--color-accent-emphasis)]",
            progress.percent === -1 && "animate-loading-horiz w-1/3 bg-gradient-to-r from-transparent via-[var(--color-accent-emphasis)] to-transparent",
          )}
          style={{
            width: progress.percent === -1 ? undefined : `${progress.percent}%`,
            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      <div className="flex justify-end mt-1">
        {progress.current !== undefined && (
          <div className="text-[9px] font-black text-[var(--color-fg-muted)] uppercase tracking-widest opacity-60">
            {progress.total !== undefined ? (
              progress.phase.split("-")[1] === "download" ||
                progress.phase === "online-patch" ? (
                <>
                  {formatBytes(progress.current)} /{" "}
                  {formatBytes(progress.total)}
                </>
              ) : (
                <>
                  {progress.current} / {progress.total}
                </>
              )
            ) : progress.phase.split("-")[1] === "download" ||
              progress.phase === "online-patch" ? (
              <>{formatBytes(progress.current)}</>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
