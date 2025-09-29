#!/usr/bin/env node

const { program } = require("commander");

const packageJSON = require("../package.json");

program
  .version(packageJSON.version)
  .usage("[--fetch] [sheets...]")
  .option("-f, --fetch", "Generate translations (optionally limit to specified sheets)")
  .option("-s, --sheets", "List available sheets")
  .addHelpText(
    "after",
    `
Examples:
  $ node ./src/index.js --fetch
  $ node ./src/index.js --fetch simulation general
  $ node ./src/index.js simulation general
  $ node ./src/index.js --sheets

Notes:
  - When one or more sheet names are provided (after --fetch or as positional args), only those sheets are fetched and existing output files are preserved.
  - Without sheet names, all configured tabs are fetched and outputs are cleaned before generation.
`
  )
  .parse(process.argv);

const options = program.opts();
if (options.fetch || Object.keys(options).length === 0) {
  const fetch = require("./fetch");
  fetch();
}

if (options.sheets) {
  const sheets = require("./sheets");
  sheets();
}
