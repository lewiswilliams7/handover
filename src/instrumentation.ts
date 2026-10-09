import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");

    if (process.env.NODE_ENV === "development") {
      void import("./lib/server/dev-database-check")
        .then(({ startDevDatabaseObjectCheck }) => {
          startDevDatabaseObjectCheck();
        })
        .catch((error: unknown) => {
          console.warn(
            "[dev-database-check] Could not load database object checks; startup will continue.",
            error instanceof Error ? error.message : "Unknown error.",
          );
        });
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
