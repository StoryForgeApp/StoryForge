import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, Trash2Icon } from "lucide-react";
import { formatSize } from "@/lib/utils";
import { Badge } from "@/mainview/components/ui/badge";
import { Button } from "@/mainview/components/ui/button";
import { ScrollArea } from "@/mainview/components/ui/scroll-area";
import { useRPC } from "@/mainview/hooks/use-rpc";

export const Route = createFileRoute("/settings/mods-cache")({
  component: RouteComponent,
});

function RouteComponent() {
  const { rpc } = useRPC();

  const { data, refetch } = useQuery({
    queryKey: ["cachedMods"],
    queryFn: async () => {
      const result = await rpc?.request.getCachedMods();
      return result ?? { mods: [], totalSize: 0 };
    },
  });

  const { mutate: removeOrphaned, isPending: isRemoving } = useMutation({
    mutationFn: async () => rpc?.request.removeOrphanedMods(),
    onSuccess: () => {
      void refetch();
    },
  });

  const mods = data?.mods ?? [];
  const totalSize = data?.totalSize ?? 0;
  const orphanCount = mods.filter((m) => !m.inUse).length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <Link to="/settings" className="text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4" />
          </Link>
          <h1 className="text-lg font-semibold">Mods Cache</h1>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <span>{mods.length} files</span>
            <span>{formatSize(totalSize)} total</span>
            {orphanCount > 0 && (
              <Badge variant="warning" className="text-xs">
                {orphanCount} orphaned
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="destructive-outline"
            disabled={orphanCount === 0 || isRemoving}
            onClick={() => removeOrphaned()}
          >
            <Trash2Icon className="mr-1.5 size-3.5" />
            {isRemoving ? "Removing..." : "Remove Orphaned"}
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3">
          {mods.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">No cached mods</p>
          ) : (
            mods.map((mod) => (
              <div
                key={mod.file}
                className="hover:bg-accent flex items-center justify-between gap-3 border-b py-2 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{mod.modName || mod.file}</p>
                  <p className="text-muted-foreground truncate text-xs">{mod.file}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-muted-foreground text-xs">{formatSize(mod.size)}</span>
                  <Badge variant={mod.inUse ? "success" : "warning"} className="text-xs">
                    {mod.inUse ? "In Use" : "Orphaned"}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
