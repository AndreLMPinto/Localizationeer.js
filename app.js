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

var options = {
    operation: 'excel2android',
    idColumnIndex: 1,
    englishColumnIndex: 2,
    excelFileName: undefined,
    xmlsFolderName: undefined
}

process.argv.forEach((val, index) => {
    // 0: node
    // 1: app.js
    if(index > 1) {
        var regex = new RegExp("^-(?<id>\\S*)=(?<val>.*)$");
        var matches = regex.exec(val);
        if(matches) {
            options[matches.groups.id] = matches.groups.val;
        }
    }
});

if(options.operation == 'excel2android') {
    console.log('Excel to Android xml files');
    var e2a = new ExcelToAndroid();
    e2a.readExcelAndApplyNewValues(options);
}
