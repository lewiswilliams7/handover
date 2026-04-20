import {
  getHaloToken,
  getHaloTickets,
  haloTicketToNormalised,
  type HaloCredentials,
  type HaloTicket,
} from "@/lib/halo";
import type { NormalisedTicket } from "@/lib/psa/types";

/** HaloPSA connection credentials (decrypted secret). */
export type HaloConnection = HaloCredentials;

/**
 * Fetches tickets from HaloPSA and returns the shared normalised shape.
 * Wraps existing `getHaloToken` / `getHaloTickets` behaviour.
 */
export async function fetchHaloTickets(
  connection: HaloConnection,
  options: {
    ticketIds?: number[];
    projectIds?: number[];
    dateFrom?: string;
  } = {},
): Promise<NormalisedTicket[]> {
  const token = await getHaloToken(connection);

  let haloTickets: HaloTicket[];
  if (options.projectIds && options.projectIds.length > 0) {
    const byId = new Map<number, HaloTicket>();
    for (const pid of options.projectIds) {
      const batch = await getHaloTickets(token, connection.haloUrl, {
        dateFrom: options.dateFrom,
        projectId: pid,
        includeDetails: true,
      });
      for (const t of batch) {
        byId.set(t.id, t);
      }
    }
    haloTickets = [...byId.values()];
  } else {
    haloTickets = await getHaloTickets(token, connection.haloUrl, {
      dateFrom: options.dateFrom,
      includeDetails: true,
    });
  }

  let normalised = haloTickets.map((t) => haloTicketToNormalised(t));
  if (options.ticketIds && options.ticketIds.length > 0) {
    const idSet = new Set(options.ticketIds);
    normalised = normalised.filter((t) => idSet.has(Number(t.id)));
  }
  return normalised;
}
