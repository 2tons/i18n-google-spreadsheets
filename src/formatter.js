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
  if (!row[categories[0]] || row[categories[0]] === "#") {
    return null;
  }

  const rowKey = categories
    .reduce((acc, category) => {
      if (!row[category]) {
        return acc;
      }

      return [...acc, row[category]];
    }, [])
    .join(delimiter);

  return {
    [rowKey]: languages.reduce((acc, language) => {
      // Add key only if it exists a translation
      if (row[language]) {
        acc[language] = row[language];
      }
      return acc;
    }, {})
  };
};

module.exports = formatRow;
