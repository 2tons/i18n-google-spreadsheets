const Promise = require("bluebird");
const fs = require("fs-extra");
const R = require("ramda");

const formatRow = require("./formatter");
const { getConfig, getDocument } = require("./config-helper");

const buildObj = (acc, [key, val]) => {
  // return R.assocPath(R.split(".", key), val, acc);
  // Do not split key if it contains a dot character followed by a space
  // or if there is a dot at the end of the line like :
  // 'Invalid Data Error. Workshop does not exist.'
  return R.assocPath(R.split(/\.(?! |$)/, key), val, acc);
};
// Sort the keys in ascendent order
const sortByFirstItem = R.sortBy(R.prop(0));
const unflattenObj = R.pipe(R.toPairs, sortByFirstItem, R.reduce(buildObj, {}));

const rowFormatter = (rows) => {
  const dictionary = rows.reduce((jsonObject, { key, data }) => {
    if (data) {
      const newRow = {};
      newRow[key] = data;
      return Object.assign(jsonObject, newRow);
    } else {
      return jsonObject;
    }
  }, {});
  return JSON.stringify(unflattenObj(dictionary), null, 2);
};

/**
 * Gets all the rows from the sheet, filters out undefined rows
 */
const getSheetRows = async ({ worksheet, categories, languages, delimiter }) => {
  const rows = await worksheet.getRows();
  const formattedRows = rows
    .map((row) => formatRow({ row, categories, languages, delimiter }))
    .filter((row) => row !== null);
  return {
    title: worksheet.title.toLowerCase(),
    rows: formattedRows,
  };
};

/**
 * Prepares data to be used with the mapper
 */
const prepareMapData = (rows, language) =>
  rows.map((row) => {
    const key = Object.keys(row)[0];
    return {
      key,
      data: row[key][language],
    };
  });

const getSheetTranslations = ({ title, rows, output, languages }) =>
  Promise.map(languages, async (language) => {
    await fs.ensureDir(`${output}/${language}`);
    const writePath = `${output}/${language}/${title}.json`;
    const mappedRows = prepareMapData(rows, language);

    const formattedRow = rowFormatter(mappedRows);
    if (formattedRow !== "{}") {
      return fs.writeFile(writePath, rowFormatter(mappedRows), "utf8");
    }
    return;
  });
const generateTranslations = (sheets, { output, languages }) => {
  process.stdout.write("Generating i18n files");
  return Promise.map(sheets, ({ title, rows }) => getSheetTranslations({ title, rows, output, languages }));
};

const getSheets = async ({ worksheets, categories, tabs, languages, delimiter }) => {
  process.stdout.write("Fetching Rows from Google Sheets");
  const sheets = await Promise.map(worksheets, (worksheet) =>
    getSheetRows({
      worksheet,
      categories,
      languages,
      delimiter,
    })
  );
  process.stdout.write(` ✓ \n`);
  return sheets.filter((sheet) => tabs.includes(sheet.title.toLowerCase()));
};

const buildTranslations = async (sheets, { staticOutput, dynamicOutput, staticLanguages, dynamicLanguages }) => {
  await fs.remove(staticOutput);
  await fs.remove(dynamicOutput);
  await fs.ensureDir(staticOutput);
  await fs.ensureDir(dynamicOutput);
  await generateTranslations(sheets, { output: staticOutput, languages: staticLanguages });
  await generateTranslations(sheets, { output: dynamicOutput, languages: dynamicLanguages });

  process.stdout.write(` ✓ \n`);
};

const fetch = async () => {
  const config = getConfig();

  if (!config) {
    console.error("You don't have the configuration file!");
    return;
  }

  const delimiter = config.delimiter || ".";
  const {
    staticOutput,
    dynamicOutput,
    categories,
    tabs = [],
    staticLanguages,
    dynamicLanguages,
    sheetId,
    credentialsPath,
  } = config;

  const doc = await getDocument({ sheetId, credentialsPath });
  await doc.loadInfo();
  const worksheets = doc.sheetsByIndex;
  const lowerCaseTabs = tabs.map((tab) => tab.toLowerCase());
  const sheets = await getSheets({
    worksheets,
    categories,
    tabs: lowerCaseTabs,
    languages: [...staticLanguages, ...dynamicLanguages],
    delimiter,
  });
  await buildTranslations(sheets, {
    staticOutput,
    dynamicOutput,
    staticLanguages,
    dynamicLanguages,
  });
  console.log("Successfully generated i18n files!");
};

module.exports = fetch;
