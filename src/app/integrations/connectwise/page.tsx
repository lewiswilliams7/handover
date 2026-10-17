import { PsaIntegrationPage } from "@/components/marketing/psa-integration-page";

export default function ConnectWiseIntegrationPage() {
  return (
    <PsaIntegrationPage
      config={{
        name: "ConnectWise",
        logo: "/connectwise.jpeg",
        marketplace: { label: "Listed on the ConnectWise Marketplace", href: "https://marketplace.connectwise.com/handover" },
        title: "Every ConnectWise client, checked every week.",
        body: "Connect ConnectWise Manage with an Inquire-only API member. Handover measures each client against its own history, puts a pound value on the ones that changed, and gives you one list for the week.",
        setupTitle: "Set it up in two minutes",
        steps: [
          "In ConnectWise Manage, open System, then Members, then API Members, and create a member for Handover.",
          "Give it a security role with Inquire access to Service Desk, Service Tickets and Finance, Agreements. No Add, Edit or Delete.",
          "Create the member's public and private keys.",
          "Paste the site URL, company ID and keys into Handover.",
        ],
        setupNote: "Handover reads ticket dates, time and agreement billing values. If something is missing, the scan tells you exactly which permission unlocks it.",
        reads: [
          { item: "Service tickets", why: "Volumes, response and resolution times, owners and contacts, measured against each client's history." },
          { item: "Boards, types and subtypes", why: "To group the work, spot recurring requests and split it into value buckets on receipts." },
          { item: "Time entries", why: "Revenue per hour for every client, so thin margins show up before the renewal." },
          { item: "Agreements and additions", why: "Monthly value and end dates, for Revenue at Risk and renewal plans." },
        ],
      }}
    />
  );
}
