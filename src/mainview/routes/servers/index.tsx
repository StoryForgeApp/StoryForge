import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/servers/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div className="p-2">Hello "/servers/"!</div>;
}
