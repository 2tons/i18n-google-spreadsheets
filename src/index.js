#!/usr/bin/env node

const { program } = require("commander");

const packageJSON = require("../package.json");

program
  .version(packageJSON.version)
  .usage("<command>")
  .option("-f, --fetch", "Generate translations")
  .option("-s, --sheets", "List available sheets")
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
