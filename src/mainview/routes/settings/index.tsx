import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageSearchIcon, SettingsIcon } from "lucide-react";

export const Route = createFileRoute("/settings/")({
  component: RouteComponent,
});

const settingsItems = [
  {
    to: "/settings/mods-cache",
    icon: PackageSearchIcon,
    label: "Mods Cache",
    description: "View and clean up cached mod files",
  },
];

function RouteComponent() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <SettingsIcon className="size-5" />
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>
      <div className="flex flex-col gap-2">
        {settingsItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="hover:bg-accent flex items-start gap-3 rounded-lg border p-3 transition-colors"
          >
            <item.icon className="text-muted-foreground mt-0.5 size-5" />
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-muted-foreground text-xs">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
