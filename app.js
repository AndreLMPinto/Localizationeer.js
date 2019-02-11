// options and arguments:
// - excel to android xml files
// -- the app/src/main/res folder which contains the values*/strings.xml files
// -- the excel file with string ids and localized strings
// -- id column index (1 based, default 1)
// -- english column index (1 based, default 2)

// - ios files to excel
// -- the folder which contains the ios files
// -- the excel file with string ids and english strings to look for in the ios files
// -- id column index (1 based, default 1)
// -- english column index (1 based, default 2)
// -- comparison threshold (0 to 100)

// - check android xml files
// -- the app/src/main/res folder which contains the values*/*.xml files

// - delete key
// -- string id to delete
// -- delete translations only (false: delete string from english too, true)

const Constants = require('./constants.js');
const ExcelToAndroid = require('./excelToAndroid.js');

process.argv.forEach((val, index) => {
    console.log(`${index}: ${val}`);
});

var e2a = new ExcelToAndroid();
e2a.readExcelAndApplyNewValues();