import { Dialog } from "@base-ui/react/dialog";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/mainview/components/ui/button";
import { Progress } from "@/mainview/components/ui/progress";
import { useRPC } from "@/mainview/hooks/use-rpc";

interface InstallDotnetDialogProps {
  open: boolean;
  dotnetVersion: string;
  onClose: () => void;
  onInstalled: () => void;
}

export function InstallDotnetDialog({
  open,
  dotnetVersion,
  onClose,
  onInstalled,
}: InstallDotnetDialogProps) {
  const { rpc } = useRPC();
  const [state, setState] = useState<"prompt" | "downloading" | "extracting" | "done" | "error">(
    "prompt",
  );
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const installedRef = useRef(false);
  const dotnetVersionRef = useRef(dotnetVersion);

  useEffect(() => {
    if (!rpc || !open) return;

    const handleProgress = ({
      version: v,
      progress: p,
      speed: s,
    }: {
      version: string;
      progress: number;
      speed: number;
    }) => {
      if (v !== dotnetVersionRef.current) return;
      setProgress(p);
      setSpeed(s);
    };

    const handleStatus = ({
      version: v,
      status: s,
      message,
    }: {
      version: string;
      status: string;
      message: string;
    }) => {
      if (v !== dotnetVersionRef.current) return;
      if (s === "downloading") setState("downloading");
      else if (s === "extracting") setState("extracting");
      else if (s === "completed") {
        setState("done");
        if (!installedRef.current) {
          installedRef.current = true;
          setTimeout(() => onInstalled(), 1000);
        }
      } else if (s === "error") {
        setState("error");
        setError(message);
      }
    };

    rpc.addMessageListener("dotnetProgress", handleProgress);
    rpc.addMessageListener("dotnetStatus", handleStatus);
    return () => {
      rpc.removeMessageListener("dotnetProgress", handleProgress);
      rpc.removeMessageListener("dotnetStatus", handleStatus);
    };
  }, [rpc, open, onInstalled]);

  useEffect(() => {
    if (open) {
      setState("prompt");
      setProgress(0);
      setSpeed(0);
      setError(null);
      installedRef.current = false;
      dotnetVersionRef.current = dotnetVersion;
    }
  }, [open, dotnetVersion]);

  const { mutate: startDownload, isPending: isDownloadStarting } = useMutation({
    mutationFn: async () => rpc?.request.downloadDotnet({ version: dotnetVersion }),
    onError: (err) => {
      setState("error");
      setError(err instanceof Error ? err.message : "Failed to start download");
    },
  });

  const handleClose = () => {
    if (state === "downloading" || state === "extracting") return;
    onClose();
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs" />
        <Dialog.Popup className="bg-background ring-foreground/10 fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl p-5 shadow-lg ring-1 outline-none">
          {state === "prompt" && (
            <div className="flex flex-col gap-4">
              <div>
                <Dialog.Title className="text-base font-medium">.NET Runtime Required</Dialog.Title>
                <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                  This game requires .NET {dotnetVersion} Runtime. Download and install it?
                </Dialog.Description>
                <p className="text-muted-foreground mt-2 text-xs">
                  Download size: ~70 MB
                  <br />
                  Installs to: ~/.dotnet
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Skip
                </Button>
                <Button onClick={() => startDownload()} disabled={isDownloadStarting}>
                  {isDownloadStarting ? (
                    <>
                      <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    "Install"
                  )}
                </Button>
              </div>
            </div>
          )}

          {state === "downloading" && (
            <div className="flex flex-col gap-4">
              <div>
                <Dialog.Title className="text-base font-medium">
                  Downloading .NET {dotnetVersion}
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                  Please wait while the runtime is downloaded.
                </Dialog.Description>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>{progress}%</span>
                <span>{speed > 0 ? `${(speed / 1_000_000).toFixed(1)} Mbps` : ""}</span>
              </div>
            </div>
          )}

          {state === "extracting" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
              <p className="text-muted-foreground text-sm">Extracting .NET runtime...</p>
            </div>
          )}

          {state === "done" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-sm font-medium text-green-500">Installation complete</p>
              <p className="text-muted-foreground text-xs">Launching game...</p>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col gap-4">
              <div>
                <Dialog.Title className="text-destructive text-base font-medium">
                  Installation Failed
                </Dialog.Title>
                <Dialog.Description className="text-muted-foreground mt-1 text-sm">
                  {error || "An unknown error occurred"}
                </Dialog.Description>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
