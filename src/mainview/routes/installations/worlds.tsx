import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/installations/worlds")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div className="p-2">Hello "/installations/worlds"!</div>;
}
