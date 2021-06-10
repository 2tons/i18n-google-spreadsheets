const Promise = require("bluebird");
const fs = require("fs-extra");
const R = require("ramda");

const formatRow = require("./formatter");
const { getConfig, getDocument } = require("./config-helper");

const buildObj = (acc, [key, val]) => {
  return R.assocPath(R.split(".", key), val, acc);
};

const unflattenObj = R.pipe(R.toPairs, R.reduce(buildObj, {}));

const rowFormatter = rows => {
  const dictionary = rows.reduce((jsonObject, { key, data }) => {
    const newRow = {};
    newRow[key] = data;
    return Object.assign(jsonObject, newRow);
  }, {});
  return JSON.stringify(unflattenObj(dictionary), null, 2);
};

/**
 * Gets all the rows from the sheet, filters out undefined rows
 */
const getSheetRows = async ({ worksheet, categories, languages, delimiter }) => {
  const rows = await worksheet.getRows();
  const formattedRows = rows
    .map(row => formatRow({ row, categories, languages, delimiter }))
    .filter(row => row !== null);
  return {
    title: worksheet.title.toLowerCase(),
    rows: formattedRows
  };
};

/**
 * Prepares data to be used with the mapper
 */
const prepareMapData = (rows, language) =>
  rows.map(row => {
    const key = Object.keys(row)[0];
    return {
      key,
      data: row[key][language]
    };
  });

const getSheetTranslations = ({ title, rows, output, languages }) =>
  Promise.map(languages, async language => {
    await fs.ensureDir(`${output}/${language}`);
    const writePath = `${output}/${language}/${title}.json`;
    const mappedRows = prepareMapData(rows, language);

    return fs.writeFile(writePath, rowFormatter(mappedRows), "utf8");
  });

const generateTranslations = (sheets, { output, languages }) => {
  process.stdout.write("Generating i18n files");
  return Promise.map(sheets, ({ title, rows }) => getSheetTranslations({ title, rows, output, languages }));
};

const getSheets = async ({ worksheets, categories, languages, delimiter }) => {
  process.stdout.write("Fetching Rows from Google Sheets");
  const sheets = await Promise.map(worksheets, worksheet =>
    getSheetRows({
      worksheet,
      categories,
      languages,
      delimiter
    })
  );
  process.stdout.write(` ✓ \n`);
  return sheets;
};

const buildTranslations = async (sheets, { output, languages, categories, delimiter }) => {
  await fs.remove(output);
  await fs.ensureDir(output);
  await generateTranslations(sheets, { output, languages, categories, delimiter });

  process.stdout.write(` ✓ \n`);
};

const fetch = async () => {
  const config = getConfig();

  if (!config) {
    console.error("You don't have the configuration file!");
    return;
  }

  const delimiter = config.delimiter || ".";
  const { output, categories, languages, sheetId, credentialsPath } = config;

  const doc = await getDocument({ sheetId, credentialsPath });
  await doc.loadInfo();
  const worksheets = doc.sheetsByIndex;
  const sheets = await getSheets({
    worksheets,
    categories,
    languages,
    delimiter
  });
  await buildTranslations(sheets, { output, languages, categories, delimiter });
  console.log("Successfully generated i18n files!");
};

module.exports = fetch;