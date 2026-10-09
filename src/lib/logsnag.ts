import { LogSnag } from "logsnag";

const client = new LogSnag({
  token: process.env.LOGSNAG_TOKEN!,
  project: process.env.LOGSNAG_PROJECT ?? "handover",
});

export async function trackEvent({
  channel,
  event,
  description,
  icon,
  tags,
  notify = false,
}: {
  channel: string;
  event: string;
  description?: string;
  icon?: string;
  tags?: Record<string, string | number | boolean>;
  notify?: boolean;
}) {
  try {
    await client.track({
      channel,
      event,
      description,
      icon,
      tags,
      notify,
    });
  } catch {
    // never throw
  }
}

export async function updateInsight(
  title: string,
  value: string | number,
  icon?: string,
) {
  try {
    await client.insight.track({
      title,
      value,
      icon,
    });
  } catch {
    // never throw
  }
}
