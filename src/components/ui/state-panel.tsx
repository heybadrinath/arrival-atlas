import { AlertTriangle, Database, LoaderCircle } from "lucide-react";

import { Card } from "@/components/ui/card";

export function LoadingPanel({
  label = "Loading flight records…",
}: {
  label?: string;
}) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <LoaderCircle
        className="size-7 animate-spin text-teal"
        aria-hidden="true"
      />
      <p className="mt-4 font-semibold">{label}</p>
      <p className="mt-1 text-sm text-muted">
        Reading the selected aggregate partition.
      </p>
    </Card>
  );
}

export function EmptyPanel({
  title = "No matching flights",
  message = "Try another month, time window, or route.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
      <Database className="size-7 text-muted" aria-hidden="true" />
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted">{message}</p>
    </Card>
  );
}

export function ErrorPanel({ error }: { error: Error }) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center border-[#d9aaa5] p-8 text-center">
      <AlertTriangle className="size-7 text-[#a83d36]" aria-hidden="true" />
      <p className="mt-4 font-semibold">The data file could not be read</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted">
        Refresh the page. If the problem continues, check the data status in
        Methodology.
      </p>
      <code className="mt-4 max-w-full overflow-auto rounded bg-paper-deep px-3 py-2 text-xs">
        {error.message}
      </code>
    </Card>
  );
}
