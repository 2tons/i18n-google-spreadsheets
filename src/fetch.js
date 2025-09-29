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

// Retry wrapper with exponential backoff for Google API 429s
const getSheetRowsWithRetry = async (args, { retries = 5, baseDelayMs = 500, maxDelayMs = 8000 } = {}) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await getSheetRows(args);
    } catch (err) {
      const status = err && (err.status || (err.response && err.response.status));
      const isRateLimit =
        status === 429 || (err && err.code === 429) || (err && err.message && err.message.includes("429"));
      if (!isRateLimit || attempt === retries) {
        throw err;
      }
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 250), maxDelayMs);
      await Promise.delay(delay);
    }
  }
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

const getSheets = async ({
  worksheets,
  categories,
  tabs,
  languages,
  delimiter,
  concurrency = 1,
  retryOptions = {},
}) => {
  process.stdout.write("Fetching Rows from Google Sheets");
  const lowerCaseTabsSet = new Set(tabs.map((t) => t.toLowerCase()));
  const filteredWorksheets = worksheets.filter((ws) => lowerCaseTabsSet.has(ws.title.toLowerCase()));
  const sheets = await Promise.map(
    filteredWorksheets,
    (worksheet) =>
      getSheetRowsWithRetry(
        {
          worksheet,
          categories,
          languages,
          delimiter,
        },
        retryOptions
      ),
    { concurrency }
  );
  process.stdout.write(` ✓ \n`);
  return sheets;
};

const buildTranslations = async (
  sheets,
  { staticOutput, dynamicOutput, staticLanguages, dynamicLanguages, clean = true }
) => {
  if (clean) {
    await fs.remove(staticOutput);
    await fs.remove(dynamicOutput);
  }
  await fs.ensureDir(staticOutput);
  await fs.ensureDir(dynamicOutput);
  await generateTranslations(sheets, { output: staticOutput, languages: staticLanguages });
  await generateTranslations(sheets, { output: dynamicOutput, languages: dynamicLanguages });

  process.stdout.write(` ✓ \n`);
};
// Parses additional sheet names passed either after --fetch/-f or as positional args
const parseRequestedSheetsFromArgv = () => {
  const argv = process.argv.slice(2);
  if (argv.length === 0) return [];

  const fetchIndex = argv.findIndex((arg) => arg === "--fetch" || arg === "-f");
  if (fetchIndex !== -1) {
    // Take all non-option args after --fetch/-f
    return argv.slice(fetchIndex + 1).filter((arg) => !arg.startsWith("-"));
  }

  // If no explicit --fetch was provided, treat non-option args as sheet names
  return argv.filter((arg) => !arg.startsWith("-"));
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

  const requestedSheets = parseRequestedSheetsFromArgv().map((s) => s.toLowerCase());
  const fetchConcurrency = Number(process.env.FETCH_CONCURRENCY || config.fetchConcurrency || 1);
  const retryOptions = {
    retries: Number(process.env.FETCH_RETRIES || config.fetchRetries || 5),
    baseDelayMs: Number(process.env.FETCH_BACKOFF_BASE_MS || config.fetchBackoffBaseMs || 500),
    maxDelayMs: Number(process.env.FETCH_BACKOFF_MAX_MS || config.fetchBackoffMaxMs || 8000),
  };

  const doc = await getDocument({ sheetId, credentialsPath });
  await doc.loadInfo();
  const worksheets = doc.sheetsByIndex;

  let sheets;
  if (requestedSheets.length > 0) {
    // Only fetch explicitly requested sheets
    const selectedWorksheets = worksheets.filter((ws) => requestedSheets.includes(ws.title.toLowerCase()));
    if (selectedWorksheets.length === 0) {
      console.warn("No matching sheets found for:", requestedSheets.join(", "));
      return;
    }
    process.stdout.write("Fetching Rows from selected sheets");
    sheets = await Promise.map(
      selectedWorksheets,
      (worksheet) =>
        getSheetRowsWithRetry(
          {
            worksheet,
            categories,
            languages: [...staticLanguages, ...dynamicLanguages],
            delimiter,
          },
          retryOptions
        ),
      { concurrency: fetchConcurrency }
    );
    process.stdout.write(` ✓ \n`);
  } else {
    const lowerCaseTabs = tabs.map((tab) => tab.toLowerCase());
    sheets = await getSheets({
      worksheets,
      categories,
      tabs: lowerCaseTabs,
      languages: [...staticLanguages, ...dynamicLanguages],
      delimiter,
      concurrency: fetchConcurrency,
      retryOptions,
    });
  }

  await buildTranslations(sheets, {
    staticOutput,
    dynamicOutput,
    staticLanguages,
    dynamicLanguages,
    clean: requestedSheets.length === 0,
  });
  console.log("Successfully generated i18n files!");
};

module.exports = fetch;
