import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-2">
      <h3>Welcome to the new Story Forge - we're slowly building it out!</h3>
    </div>
  );
}
