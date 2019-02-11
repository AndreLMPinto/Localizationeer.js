const constants = require('./constants.js');
var Excel = require('exceljs');
var Path = require('path');

// The following code is based on the analogous class from the C# version of this project.
module.exports = class ExcelToAndroid {
    constructor() {
        this.idColumnIndex = 1;
        this.englishColumnIndex = 4;
        this.excelFileName = 'C:\\Users\\pintoa\\Downloads\\Request_2019_01_29_.xlsx';
        this.xmlsFolderName = 'C:\\git\\sprocket_android_app\\app\\src\\main\\res';
    }

    readExcelAndApplyNewValues() {
        var $this = this;
        var info = {
            summary: {},
            error: null
        };
        try {
            var idColumnIndex = this.idColumnIndex;
            var englishColumnIndex = this.englishColumnIndex;
            var xmlsFolderName = this.xmlsFolderName;
            var workbook = new Excel.Workbook();
            var promise = workbook.xlsx.readFile(this.excelFileName)
                // will have to adjust code because of this promise!
                .then(function() {
                    var worksheet = workbook.worksheets[0];
                    var totalRows = worksheet.rowCount;
                    var totalCols = worksheet.columnCount;

                    for(var col = englishColumnIndex; col < totalCols; col++) {
                        var language = worksheet.getCell(1, col).text;
                        var languageCodes = constants.androidLanguageToCode[language];
                        if(languageCodes && languageCodes.length) {
                            var values = {};
                            for(var row = 2; row <= totalRows; row++) {
                                var id = worksheet.getCell(row, idColumnIndex).text;
                                if(id) {
                                    var value = worksheet.getCell(row, col).text;
                                    if(values[id]) {
                                        // duplicate key detected
                                        throw new Error('Duplicate key detected "' + id + '".\nPlease review your Excel file.')
                                    }
                                    values[id] = value;
                                }
                            }
                            if(Object.keys(values).length) {
                                languageCodes.forEach(function(code, index, languageCode) {
                                    var fileName = Path.join(xmlsFolderName, "values" + (code ? "-" + code : "") + "\\strings.xml");
                                    var languageAndCode = language + (code ? " (" + code + ")": "");
                                    var output = $this.setValuesInXml(values, fileName);
                                    info.summary[languageAndCode] = output;
                                    return;
                                });
                            }
                        }
                    }
                },
                function(error) {
                    console.log(error);
                });
        } catch(error) {
            info.error = error;
        }
        return info;
    }

    setValuesInXml(values, fileName) {
        var fs = require('fs');
        var xml2js = require('xml2js');
        var parser = new xml2js.Parser();

        fs.readFile(fileName, function(err, data) {
            if(err) {
                console.log(err);
                return;
            }
            parser.parseString(data, function(err, data) {
                if(err) {
                    console.log(err);
                    return;
                }
                var strings = data.resources.string;
                for(var id in values) {
                    for(var index in strings) {
                        var string = strings[index];
                        if(string.$.name == id) {
                            strings._ = values[id];
                        }
                    }
                }
            });
        });
    }
}