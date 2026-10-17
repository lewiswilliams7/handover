import { PsaIntegrationPage } from "@/components/marketing/psa-integration-page";

export default function HaloPsaIntegrationPage() {
  return (
    <PsaIntegrationPage
      config={{
        name: "HaloPSA",
        logo: "/halopsa.png",
        marketplace: { label: "Listed on the HaloPSA Marketplace", href: "https://usehalo.com/integration/handover-integration/" },
        title: "Every HaloPSA client, checked every week.",
        body: "Connect HaloPSA with a read-only application. Handover measures each client against its own history, puts a pound value on the ones that changed, and gives you one list for the week.",
        story: {
          stat: "~45",
          text: "warning signs on the first scan, for an MSP that moved to HaloPSA in April 2026. New to Halo is not too early.",
          href: "/case-studies/five-months-on-halopsa",
        },
        setupTitle: "Set it up in two minutes",
        steps: [
          "In HaloPSA, open Configuration, then Integrations, then Halo API, and create an application.",
          "Choose client-credentials authentication. Do not grant write, action or administration permissions.",
          "Grant read access to Tickets, TicketType and ClientContract.",
          "Paste the HaloPSA URL, Client ID and Client Secret into Handover. Add a tenant only if your installation asks for one.",
        ],
        setupNote: "Recurring invoices and quotes are read too when your role allows it. If something is missing, the scan tells you exactly which permission unlocks it.",
        reads: [
          { item: "Tickets", why: "Volumes, response and resolution times, owners and contacts, measured against each client's history." },
          { item: "Ticket types and categories", why: "To group the work, spot recurring requests and split it into value buckets on receipts." },
          { item: "Time logged", why: "Revenue per hour for every client, so thin margins show up before the renewal." },
          { item: "Client contracts", why: "Monthly value and end dates, for Revenue at Risk and renewal plans." },
          { item: "Recurring invoices and quotes", why: "Billing value where contracts do not hold it, and quotes left waiting." },
        ],
      }}
    />
  );
}
