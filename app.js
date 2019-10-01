#!/usr/bin/env node

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

// - android files to excel
// -- the folder which contains the anrdoid xml files
// -- the excel file with string ids and english strings to look for in the android files
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
const ExportXliff = require('./exportXliffFromXcode');
const ImportXliff = require('./importXliffFromXcode');
const IosToExcel = require('./iOSToExcel');
const AndroidToExcel = require('./androidToExcel');

var options = {
    operation: 'androidCheck',
    paramAction: undefined,
    paramId: undefined,
    paramSource: undefined,
    paramTarget: undefined,
    paramForce: false,
    paramKeepDefault: false,
    idColumnIndex: 1,
    englishColumnIndex: 2,
    excelFileName: undefined,
    xmlsFolderName: undefined,
    identationSpaces: 4,
    missingStrings: true,
    formatIssues: true,
    ignoreFiles: '',
    output: undefined,
    localizationPath: undefined,
    xcodeProjPath: undefined
}

if (process.argv.length < 3) {
    console.log('Wrong number of parameters'
        + '\nCommon usage: node app.js <args>'
        + '\nor, when properly installed: loca <args>'
        + '\n-operation=?             excel2android'
        + '\n                         excel2ios'
        + '\n                         ios2excel'
        + '\n                         android2excel'
        + '\n                         exportXliff'
        + '\n                         importXliff'
        + '\n                         androidCheck (default)'
        + '\n                         androidTools'
        + '\n-paramAction=?           delete'
        + '\n                         clone'
        + '\n                         join'
        + '\n-paramId=?               string id'
        + '\n-paramSource=?           source string id'
        + '\n                         or comma separated list of string ids'
        + '\n-paramTarget=?           target string id'
        + '\n-paramForce=?            default to false'
        + '\n-paramKeepDefault=?      default to false'
        + '\n-paramSeparator=?        separator to the join action'
        + '\n-excelFileName=?         /path/to/file.xls (or file.csv with ";" as separators)'
        + '\n-xmlsFolderName=?        /app/repo/app/src/main/res'
        + '\n-idColumnIndex=?         default to 1'
        + '\n-idEnglishColumnIndex=?  default to 2'
        + '\n-indentationSpaces=?     default to 4'
        + '\n-missingStrings=?        default to true'
        + '\n-formatIssues=?          default to true'
        + '\n-noDefaultOnly=?         default to false'
        + '\n-notTranslatedOnly=?     default to false'
        + '\n-ignoreFiles=?           comma separated list of files'
        + '\n-output=?                output file name'
        + '\n-localizationPath=?      /Path/to/where/it/will/export/xliffs'
        + '\n-xcodeProjPath=?         /Path/to/where/the/xcodeproj/is/App.xcodeproj');
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
} else if(options.operation == 'androidTools') {
    var axc = new AndroidXmlChecker();
    axc.executeAction(options);
} else if(options.operation == 'excel2ios') {
    console.log('Excel to iOS xliff files');
    let e2iOS = new ExcelToiOS();
    e2iOS.readExcelAndApplyNewValues(options);
} else if (options.operation == 'exportXliff') {
    console.log('Export Xliff files from Xcode');
    ExportXliff.exportXliffFromXcode(options);
} else if (options.operation == 'importXliff') {
    console.log('Import Xliff files from Xcode');
    ImportXliff.importXliffFromXcode(options);
} else if (options.operation == 'ios2excel') {
    console.log('iOS xliff files to Excel');
    let iOS2e = new IosToExcel();
    iOS2e.readExcelAndCompleteWithIosValues(options);
} else if (options.operation == 'android2excel') {
    console.log('Android xml files to Excel');
    let android2E = new AndroidToExcel();
    android2E.readExcelAndCompleteWithAndroidValues(options);
}
