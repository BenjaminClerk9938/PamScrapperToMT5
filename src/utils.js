const fs = require("fs");

function saveDataToFile(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Data saved to ${filePath}`);
}

module.exports = { saveDataToFile };
