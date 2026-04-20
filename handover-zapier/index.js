const authentication = require("./authentication");
const generateReport = require("./creates/generateReport");

module.exports = {
  version: require("./package.json").version,
  platformVersion: require("zapier-platform-core").version,
  authentication,
  creates: { [generateReport.key]: generateReport },
};
