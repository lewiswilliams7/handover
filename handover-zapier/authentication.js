module.exports = {
  type: "custom",
  fields: [
    {
      key: "api_key",
      label: "API Key",
      required: true,
      helpText: "Find your API key in Handover under Settings → Integrations → Zapier",
    },
  ],
  test: {
    url: "https://gethandover.uk/api/webhooks/zapier/test",
    method: "POST",
    body: { api_key: "{{bundle.authData.api_key}}" },
  },
  connectionLabel: "Handover API",
};
