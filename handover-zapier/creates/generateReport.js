module.exports = {
  key: "generate_report",
  noun: "Report",
  display: {
    label: "Generate Report",
    description:
      "Generate a client-ready report from ticket data and push back to your PSA automatically.",
  },
  operation: {
    inputFields: [
      { key: "id", label: "Ticket ID", required: true },
      { key: "title", label: "Ticket Title/Subject", required: true },
      { key: "status", label: "Status", required: true },
      { key: "client", label: "Client Name", required: true },
      { key: "assigned_to", label: "Assigned Agent", required: false },
      { key: "priority", label: "Priority", required: false },
      { key: "description", label: "Description", required: false },
      { key: "time_logged", label: "Time Logged (hours)", required: false },
      { key: "target_date", label: "Target Date", required: false },
    ],
    perform: {
      url: "https://gethandover.uk/api/webhooks/zapier",
      method: "POST",
      body: {
        api_key: "{{bundle.authData.api_key}}",
        id: "{{bundle.inputData.id}}",
        title: "{{bundle.inputData.title}}",
        status: "{{bundle.inputData.status}}",
        client: "{{bundle.inputData.client}}",
        assigned_to: "{{bundle.inputData.assigned_to}}",
        priority: "{{bundle.inputData.priority}}",
        description: "{{bundle.inputData.description}}",
        time_logged: "{{bundle.inputData.time_logged}}",
        target_date: "{{bundle.inputData.target_date}}",
      },
    },
    sample: {
      success: true,
      summary: "Work is underway to resolve the reported issue.",
      actions: [],
      risks: [],
    },
  },
};
