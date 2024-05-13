/**
 *  Formats rows into the { key : { language: translation } } object
 *  ie. {
 *  	"common.greeting": {
 *  		"en_CA": "Hello!",
 *  		"fr_CA": "Bonjour!"
 *  	}
 *  }
 */

const formatRow = ({ row, categories, languages, delimiter }) => {
  // Ignore row if :
  // - categories[0] column is empty or equals to #
  // - "ignore" column contains "yes"
  if (!row.get(categories[0]) || row.get(categories[0]) === "#" || row.get("ignore") === "yes") {
    return null;
  }

  const rowKey = categories
    .reduce((acc, category) => {
      if (!row.get(category)) {
        return acc;
      }

      return [...acc, row.get(category)];
    }, [])
    .join(delimiter);

  return {
    [rowKey]: languages.reduce((acc, language) => {
      // Add key only if it exists a translation
      if (row.get(language)) {
        acc[language] = row.get(language);
      }
      return acc;
    }, {}),
  };
};

module.exports = formatRow;
