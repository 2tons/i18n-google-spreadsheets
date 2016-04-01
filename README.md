# Introduction

`google-sheet-i18n` provides an way for translations files to be generated using google sheets.

# Setup

## Google Sheet Configuration

Organize translations in such a way that each row will be configured like so

The first row will be used as the categories, and the rest will be the i18n keys
as follows,

### Table

| Category | SubCategory | SubCategory2 | .... | en_CA | en_FR | ... |
| :------: | :---------: | :----------: | :--: | :---: | :---: | :-: |
| onboarding | landing | intro | ... | Hello! | Bonjour! |  ... |
| onboarding | landing | exit | ... | Good bye! | Au revior! |  ... |

## CLI Configuration

Configuration requires a credentials JSON file that can be obtained through Google's developer
console with the following instructions ( Some instructions borrowed from 
[node-google-spreadsheet](https://github.com/theoephraim/node-google-spreadsheet) )

1. Go to the [Google Developers Console](https://console.developers.google.com/project)
2. Select your project or create a new one (and then select it)
3. Enable the Drive API for your project
  - In the sidebar on the left, expand __APIs & auth__ > __APIs__
  - Search for "drive"
  - Click on "Drive API"
  - click the blue "Enable API" button
4. Create a service account for your project
  - In the sidebar on the left, expand __APIs & auth__ > __Credentials__
  - Click blue "Add credentials" button
  - Select the "Service account" option
  - Select the "JSON" key type option
  - Click blue "Create" button
  - your JSON key file is generated and downloaded to your machine (__it is the only copy!__)
  - note your service account's email address (also available in the JSON key file)
5. Share the doc (or docs) with your service account using the email noted above

## Running the Translations

1. `npm install -g google-sheet-i18n`
2. Create a `i18n.config.js` file in the folder you wish to run the translations on.
3. `i18n start`


## i18n Configuration
```js

var path = require('path')

module.exports = {
  categories: ['category', 'subcategory', 'subcategory2'],
  credentialsPath: path.join(process.cwd(), 'credentials.json'),
  languages: ['en_CA', 'fr_CA', 'es_ES'],
  sheetId: 'YOUR_SHEET_ID',
  suffix: '_lang',
  outPath: path.join(process.cwd(), '/locale'),
  preset: 'json',
}

```

- `categories` - (required) Different columns used to create a translation key, ie. 
`onboarding.landing.intro` is created the [table](#table) above when generating i18n files

- `credentialsPath` - (required) Absolute path to your crendentials JSON file

- `languages`: (required) Specify the column on the sheets we want to use as the i18n values, 
Note: this will also be the name of the folders in which the translations will be outputted

- `sheetId` - (required) The ID of the Google Sheet document that you want to use

- `outPath` - (required) The absolute path to the output folder

- `preset` - (optional) Predefined templates to format each row in accordance to specification. 
  - Current presets consists of: `php`, `json`

- `suffix` - (optional) As the name of each worksheet will correspond to the name of the file, ie. `data` sheet
will output as `data.someExtension`, suffix allows for users to define suffix

- `mapper` - (optional) Used to define own row mappings





 

