export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-foreground">
      <h1 className="text-3xl font-semibold tracking-tight">Mission Control</h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Scaffold online. Crew status, cron health, and system screens ship in
        upcoming waves.
      </p>
    </div>
  );
}
