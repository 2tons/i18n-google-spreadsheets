const { GoogleSpreadsheet } = require("google-spreadsheet");
const path = require("path");
const { JWT } = require("google-auth-library");

const getConfig = () => {
  try {
    return require(path.join(process.cwd(), "i18n-google-spreadsheets.config.js"));
  } catch (err) {
    return null;
  }
};

const getDocument = async ({ sheetId, credentialsPath }) => {
  const cred = require(credentialsPath);
  const serviceAccountAuth = new JWT({
    email: cred.client_email,
    key: cred.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
  return doc;
};

module.exports = {
  getConfig,
  getDocument,
};
