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

const ExcelToAndroid = require('./excelToAndroid.js');
const AndroidXmlChecker = require('./androidXmlChecker.js');
const ExcelToiOS = require('./excelToiOS');

var options = {
    operation: 'androidCheck',
    idColumnIndex: 1,
    englishColumnIndex: 2,
    excelFileName: undefined,
    xmlsFolderName: undefined,
    identationSpaces: 4,
    missingStrings: true,
    formatIssues: true,
    ignoreFiles: '',
    output: undefined
}

if (process.argv.length < 3) {
    console.log('Wrong number of parameters'
        + '\nCommon usage: node app.js <args>'
        + '\n-operation=?             excel2android'
        + '\n                         excel2ios'
        + '\n                         androidCheck (default)'
        + '\n-excelFileName=?         /path/to/file.xls'
        + '\n-xmlsFolderName=?        /app/repo/app/src/main/res'
        + '\n-idColumnIndex=?         default to 1'
        + '\n-idEnglishColumnIndex=?  default to 2'
        + '\n-indentationSpaces=?     default to 4'
        + '\n-missingStrings=?        default to true'
        + '\n-formatIssues=?          default to true'
        + '\n-noDefaultOnly=?         default to false'
        + '\n-ignoreFiles=?           comma separated list of files'
        + '\n-output=?                output file name');
    return;
}

process.argv.forEach((val, index) => {
    // 0: node
    // 1: app.js
    if(index > 1) {
        var regex = new RegExp("^-(\\S*)=(.*)$");
        var matches = regex.exec(val);
        if(matches) {
            options[matches[1]] = matches[2];
        }
    }
});

if(options.operation == 'excel2android') {
    console.log('Excel to Android xml files');
    var e2a = new ExcelToAndroid();
    e2a.readExcelAndApplyNewValues(options);
} else if(options.operation == 'androidCheck') {
    console.log('Android xml checker');
    var axc = new AndroidXmlChecker();
    axc.validateXmls(options);
} else if(options.operation == 'excel2ios') {
    console.log('Excel to iOS xliff files');
    let e2iOS = new ExcelToiOS();
    e2iOS.readExcelAndApplyNewValues(options);
}
