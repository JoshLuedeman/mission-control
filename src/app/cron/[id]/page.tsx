import { Suspense } from "react";
import CronJobDetailClient from "./cron-job-detail-client";

async function ResolvedCronJobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CronJobDetailClient id={id} />;
}

export default function CronJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-4xl px-6 py-12 text-sm text-muted-foreground">
          Loading job history…
        </div>
      }
    >
      <ResolvedCronJobDetail params={params} />
    </Suspense>
  );
}
