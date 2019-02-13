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
        this.identationSpaces = 4;
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
        if (options.identationSpaces !== undefined) {
            this.identationSpaces = options.identationSpaces;
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
        var promises = [];
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
                                if(values[id]) {
                                    throw new Error('Duplicate key detected "' + id + '". Please review your Excel file.')
                                }
                                
                                var value = $this.sanityze(worksheet.getCell(row, col).text);
                                if (value) {
                                    values[id] = value;
                                }
                            }
                        }
                        // write all strings for one language to the correct strings.xml file 
                        if(Object.keys(values).length) {
                            for(var index in languageCodes) {
                                var code = languageCodes[index];
                                var fileName = Path.join($this.xmlsFolderName, "values" + (code ? "-" + code : "") + Path.sep + "strings.xml");
                                var languageAndCode = language + (code ? " (" + code + ")": "");
                                promises.push($this.setValuesInXml(languageAndCode, values, fileName));
                            }
                        }
                    }
                }

                Promise.all(promises).then(function() {
                    console.log('Finished');
                }).catch(function (err) {
                    console.log('Finished with error ' + err);
                });
            })
            .catch(function(err) {
                console.log(err);
            });
    }

    setValuesInXml(languageAndCode, values, fileName) {
        var $this = this;
        return new Promise(function (resolve, reject) {
            fs.readFile(fileName, function(err, data) {
                if(err) {
                    console.log(err);
                    return;
                }
                var xml = data.toString();
                var changes = 0;
                for(var id in values) {
                    var regex = new RegExp("\<string name=\"" + id + "\"\>([\\s\\S]*?)\<\/string\>", "g");
                    var matches = regex.exec(xml);
                    if(matches) {
                        if(matches[1] != values[id]) {
                            xml = xml.replace(regex, "<string name=\"" + id + "\">" + values[id] + "</string>");
                            changes++;
                        }
                    } else {
                        var stringElement = "<string name=\"" + id + "\">" + values[id] + "</string>\n</resources>";
                        xml = xml.replace(/\<\/resources\>/, stringElement.padStart(stringElement.length + $this.identationSpaces));
                        changes++;
                    }
                }
                if(changes) {
                    fs.writeFile(fileName, xml, function(err) {
                        if(err) {
                            console.log(err);
                            reject(err);
                            return;
                        }
                        console.log(languageAndCode + ": " + changes);
                        resolve();
                    });
                } else {
                    console.log(languageAndCode + ": NONE");
                    resolve();
                }
            });
        });
    }
}