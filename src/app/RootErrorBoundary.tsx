import { Bug, House, RotateCw } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { BrandMark, Button, ButtonLink, ErrorState, Page } from '@/components/ui';
import { NotFoundPage } from './NotFoundPage';

function describe(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

/** Technical details, only while developing. Users never see a stack trace. */
function DevDetails({ error }: { error: unknown }) {
  if (!import.meta.env.DEV) return null;
  return (
    <details className="mx-auto mt-2 w-full max-w-[560px] rounded-lg border border-line bg-surface p-4 text-left text-small text-ink-2">
      <summary className="font-semibold text-ink">Tekniske detaljer (vises bare under utvikling)</summary>
      <pre className="mt-3 overflow-x-auto font-mono text-caption whitespace-pre-wrap">
        {describe(error)}
        {error instanceof Error && error.stack ? `\n\n${error.stack}` : ''}
      </pre>
    </details>
  );
}

function ErrorActions() {
  return (
    <ButtonLink to="/" variant="ghost" icon={<House />} reloadDocument>
      Gå til forsiden
    </ButtonLink>
  );
}

/**
 * A page crashed, but the shell (navigation) is still standing: show the error
 * where the page would have been, so the user can simply go somewhere else.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return (
    <Page>
      <ErrorState
        icon={<Bug />}
        title="Denne siden virker ikke akkurat nå"
        description="Noe gikk galt hos oss, ikke hos deg. Prøv å laste siden på nytt."
        onRetry={() => window.location.reload()}
        action={<ErrorActions />}
      />
      <DevDetails error={error} />
    </Page>
  );
}

/** Last resort: the shell itself failed. Rendered without any navigation. */
export function RootErrorBoundary() {
  const error = useRouteError();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 py-12 text-center text-ink">
      <BrandMark className="size-14" />
      <h1 className="mt-6 font-display text-title font-semibold tracking-tight">
        Kompass mistet retningen
      </h1>
      <p className="mt-2 max-w-[36ch] text-body text-ink-2">
        Noe gikk galt, og appen klarte ikke å starte. Det du har lagret, ligger trygt på
        enheten din.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Button icon={<RotateCw />} onClick={() => window.location.reload()}>
          Last inn på nytt
        </Button>
        <a
          href="/"
          className="inline-flex h-11 items-center rounded-md px-4 font-semibold text-ink transition-[scale,background-color] duration-150 ease-out hover:bg-ink/6 active:scale-[0.97]"
        >
          Gå til forsiden
        </a>
      </div>
      <DevDetails error={error} />
    </div>
  );
}
