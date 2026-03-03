import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div className="p-2">Hello "/settings/"!</div>;
}
