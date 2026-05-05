export type NormalisedNote = {
  id: string;
  date: string | null;
  author: string;
  type: "note" | "email_sent" | "email_received";
  content: string;
};

export type NormalisedTicket = {
  id: string;
  title: string;
  type: "ticket" | "project";
  status: string;
  client: string;
  clientContact: string | null;
  assignedEngineer: string | null;
  priority: string | null;
  targetDate: string | null;
  timeLogged: number;
  description: string | null;
  notes: NormalisedNote[];
  customfields?: Array<{
    id?: number;
    name?: string;
    label?: string;
    value?: string | number | null;
    display?: string | null;
  }> | null;
  source: "halopsa" | "connectwise" | "manual";
};
