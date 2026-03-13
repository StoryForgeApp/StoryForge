import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import * as v from "valibot";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/mainview/components/ui/tabs";

const SearchSchema = v.object({
  path: v.string(),
});

type LogType = "main" | "chat" | "audit" | "debug";
type LogLevel = "info" | "error" | "warning" | "default" | "debug";

interface LogUpdateEvent {
  installationPath: string;
  logType: LogType;
  newContent: string;
  timestamp: number;
}

interface LogLine {
  text: string;
  level: LogLevel;
}

const LOG_TABS: { value: LogType; label: string }[] = [
  { value: "main", label: "Main" },
  { value: "chat", label: "Chat" },
  { value: "audit", label: "Audit" },
  { value: "debug", label: "Debug" },
];

// Regex to match timestamp followed by log level: "4.3.2026 17.02.53 [Notification]" or "2024.01.15 10:30:45 [Level]"
const LOG_LINE_REGEX =
  /^\s*\d{1,4}[.\-/]\d{1,2}[.\-/]\d{1,4}[\sT]\d{1,2}[.:]\d{2}[.:]\d{2}[.\-/]?\d{0,4}\s*\[(\w+)\]/;

// Regex to match log level at start of line: "ERROR:", "WARNING:", etc.
const LOG_LEVEL_REGEX = /^(\w+):/;

function getLogLevel(level: string): LogLevel {
  const normalized = level.toLowerCase();
  if (normalized === "notification" || normalized === "info") return "info";
  if (normalized === "error" || normalized === "fatal" || normalized === "exception")
    return "error";
  if (normalized === "warning" || normalized === "warn") return "warning";
  if (normalized === "debug" || normalized === "verbosedebug") return "debug";
  return "default";
}

function parseLogLevel(line: string): LogLevel {
  if (line.trimStart().startsWith("at ")) return "error"; // Stack trace line

  // First try to match timestamp format: "4.3.2026 17.02.53 [Notification]"
  const timestampMatch = line.match(LOG_LINE_REGEX);
  if (timestampMatch) {
    return getLogLevel(timestampMatch[1]);
  }

  // Then try to match level at start: "ERROR: ..."
  const levelMatch = line.match(LOG_LEVEL_REGEX);
  if (levelMatch) {
    return getLogLevel(levelMatch[1]);
  }

  return "default";
}

function parseLogLines(content: string): LogLine[] {
  if (!content) return [];
  return content.split("\n").map((line) => ({
    text: line,
    level: parseLogLevel(line),
  }));
}

function LogLineComponent({ line }: { line: LogLine }) {
  const colorClass =
    line.level === "info"
      ? "text-info"
      : line.level === "error"
        ? "text-destructive"
        : line.level === "warning"
          ? "text-warning"
          : line.level === "debug"
            ? "text-muted-foreground"
            : "text-foreground";

  return (
    <div className={cn("font-mono text-sm break-all whitespace-pre", colorClass)}>
      {line.text || "\u00A0"}
    </div>
  );
}

function RouteComponent() {
  const { path } = Route.useSearch();
  const { electroview } = useRouteContext({ from: "__root__" });
  const [logs, setLogs] = useState<Record<LogType, string>>({
    main: "",
    chat: "",
    audit: "",
    debug: "",
  });
  const scrollRefs = useRef<Record<LogType, HTMLDivElement | null>>({
    main: null,
    chat: null,
    audit: null,
    debug: null,
  });

  const { data: initialLogs } = useQuery({
    queryKey: ["logs", path],
    queryFn: async () => {
      const result = await electroview.rpc?.request.getLogs({ path });
      return result;
    },
  });

  // Initialize logs from initial fetch
  useEffect(() => {
    if (initialLogs?.logs) {
      setLogs(initialLogs.logs);
    }
  }, [initialLogs]);

  // Start log watcher on mount
  useEffect(() => {
    // Start watching logs
    void electroview.rpc?.request.startLogWatcher({ path });

    // Set up message listener for live updates
    const handleLogUpdate = ({ installationPath, logType, newContent }: LogUpdateEvent) => {
      if (installationPath === path) {
        setLogs((prev) => ({
          ...prev,
          [logType]: prev[logType] + newContent,
        }));
      }
    };

    electroview.rpc?.addMessageListener("logUpdate", handleLogUpdate);

    return () => {
      // Clean up on unmount
      void electroview.rpc?.request.stopLogWatcher({ path });
      electroview.rpc?.removeMessageListener("logUpdate", handleLogUpdate);
    };
  }, [path, electroview]);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    for (const logType of LOG_TABS.map((t) => t.value)) {
      const scrollEl = scrollRefs.current[logType];
      if (scrollEl) {
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
    }
  }, [logs]);

  return (
    <div className="flex size-full flex-col overflow-hidden p-4">
      <Tabs defaultValue="main" className="size-full">
        <TabsList className="border-border bg-sidebar border">
          {LOG_TABS.map((tab) => (
            <TabsTab key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTab>
          ))}
        </TabsList>

        <div className="relative size-full min-h-0 min-w-0">
          {LOG_TABS.map((tab) => (
            <TabsPanel className="size-full" key={tab.value} value={tab.value}>
              <div className="border-border bg-sidebar size-full overflow-hidden rounded-md border">
                <ScrollArea
                  className="size-full"
                  viewportRef={(el) => {
                    scrollRefs.current[tab.value] = el;
                  }}
                >
                  <div className="p-4">
                    {logs[tab.value] ? (
                      parseLogLines(logs[tab.value]).map((line, index) => (
                        <LogLineComponent key={index} line={line} />
                      ))
                    ) : (
                      <div className="text-foreground font-mono text-sm">No logs available</div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsPanel>
          ))}
        </div>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute("/installations/logs")({
  component: RouteComponent,
  validateSearch: SearchSchema,
});
