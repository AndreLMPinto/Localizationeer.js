const constants = require('./constants.js');
var Excel = require('exceljs');
var Path = require('path');
var fs = require('fs');

// The following code is based on the analogous class from the C# version of this project.
module.exports = class ExcelToAndroid {
    constructor() {
        this.idColumnIndex = 1;
        this.englishColumnIndex = 2;
        this.excelFileName = undefined;
        this.xmlsFolderName = undefined;
    }

    sanityze(text) {
        return text.trim().replace(/\'/g, "\\\'");
    }

    readExcelAndApplyNewValues(options) {
        if(options.idColumnIndex !== undefined) {
            this.idColumnIndex = options.idColumnIndex;
        }
        if(options.englishColumnIndex !== undefined) {
            this.englishColumnIndex = options.englishColumnIndex;
        }
        if(options.excelFileName !== undefined) {
            this.excelFileName = options.excelFileName;
        }
        if(options.xmlsFolderName !== undefined) {
            this.xmlsFolderName = options.xmlsFolderName;
        }

        if(this.excelFileName === undefined || !fs.existsSync(this.excelFileName)) {
            console.log('Please inform the path to the Excel file containing string ids and localized strings.');
            return;
        }

        if(this.xmlsFolderName === undefined || !fs.existsSync(this.xmlsFolderName)) {
            console.log('Please inform the path to the "app/src/main/res" folder containing the values*/strings.xml files.');
            return;
        }

        var $this = this;
        var workbook = new Excel.Workbook();
        workbook.xlsx.readFile(this.excelFileName)
            .then(function() {
                var worksheet = workbook.worksheets[0];
                var totalRows = worksheet.rowCount;
                var totalCols = worksheet.columnCount;

                for(var col = $this.englishColumnIndex; col < totalCols; col++) {
                    var language = worksheet.getCell(1, col).text;
                    var languageCodes = constants.androidLanguageToCode[language];
                    if(languageCodes && languageCodes.length) {
                        var values = {};
                        // read all strings for one language from the excel file
                        for(var row = 2; row <= totalRows; row++) {
                            var id = worksheet.getCell(row, $this.idColumnIndex).text;
                            if(id) {
                                var value = $this.sanityze(worksheet.getCell(row, col).text);
                                if(values[id]) {
                                    throw new Error('Duplicate key detected "' + id + '". Please review your Excel file.')
                                }
                                values[id] = value;
                            }
                        }
                        // write all strings for one language to the correct strings.xml file 
                        if(Object.keys(values).length) {
                            for(var index in languageCodes) {
                                var code = languageCodes[index];
                                var fileName = Path.join($this.xmlsFolderName, "values" + (code ? "-" + code : "") + "\\strings.xml");
                                var languageAndCode = language + (code ? " (" + code + ")": "");
                                $this.setValuesInXml(languageAndCode, values, fileName);
                            }
                        }
                    }
                }
            })
            .catch(function(err) {
                console.log(err);
            });
    }

    setValuesInXml(languageAndCode, values, fileName) {
        fs.readFile(fileName, function(err, data) {
            if(err) {
                console.log(err);
                return;
            }
            var xml = data.toString();
            var changes = 0;
            for(var id in values) {
                var idFound = false;
                var regex = new RegExp("\<string name=\"" + id + "\"\>(?<val>[\\s\\S]*?)\<\/string\>", "g");
                var matches = regex.exec(xml);
                if(matches) {
                    if(matches.groups.val != values[id]) {
                        xml = xml.replace(regex, "<string name=\"" + id + "\">" + values[id] + "</string>");
                        changes++;
                    }
                } else {
                    xml = xml.replace(/\<\/resources\>/, "    <string name=\"" + id + "\">" + values[id] + "</string>\n</resources>");
                    changes++;
                }
            }
            if(changes) {
                fs.writeFile(fileName, xml, function(err) {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    console.log(languageAndCode + ": " + changes);
                });
            } else {
                console.log(languageAndCode + ": NONE");
            }
        });
    }
}