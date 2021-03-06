const constants = require('./constants');
const ExcelFileHandler = require('./excel/excelFileHandler');
let excelFileHandler = new ExcelFileHandler();
var Path = require('path');
var fs = require('fs');

// The following code is based on the analogous class from the C# version of this project.
module.exports = class ExcelToAndroid {
    constructor() {
        this.xmlsFolderName = undefined;
        this.identationSpaces = 4;
    }

    validate(options) {
        if (options.identationSpaces !== undefined) {
            this.identationSpaces = options.identationSpaces;
        }
        if (options.xmlsFolderName !== undefined) {
            this.xmlsFolderName = options.xmlsFolderName;
        }

        if (this.xmlsFolderName === undefined || !fs.existsSync(this.xmlsFolderName)) {
            console.log('Please inform the path to the "app/src/main/res" folder containing the values*/strings.xml files.');
            return false;
        }

        return true;
    }

    readExcelAndApplyNewValues(options) {
        var $this = this;
        if (!$this.validate(options)) {
            return;
        }

        var promises = [];
        options.languageCodesPlatform = constants.android;

        excelFileHandler.readExcelLanguageData(options, function (err, results) {
            if (err) {
                console.log(err);
                return;
            }

            if (results) {
                for (var resultsIndex in results) {
                    let excelLanguageData = results[resultsIndex];
                    let language = excelLanguageData.language;
                    for (var index in excelLanguageData.languageCodes) {
                        var code = excelLanguageData.languageCodes[index];
                        var fileName = Path.join($this.xmlsFolderName, "values" + (code ? "-" + code : "") + Path.sep + "strings.xml");
                        var languageAndCode = language + (code ? " (" + code + ")" : "");
                        promises.push($this.setValuesInXml(languageAndCode, excelLanguageData.values, fileName));
                    }
                }
            }

            Promise.all(promises).then(function (values) {
                var sum = values.reduce(function(total, number) { 
                    return total + number;
                });
                console.log('Finished. Files changed: ' + sum + ' of ' + values.length);
            }).catch(function (err) {
                console.log('Finished with error ' + err);
            });
        });
    }

    setValuesInXml(languageAndCode, values, fileName) {
        var $this = this;
        return new Promise(function (resolve, reject) {
            if (!fs.existsSync(fileName)) {
                console.log('File ' + fileName + ' not found');
                reject(new Error('File ' + fileName + ' not found'));
                return;
            }

            fs.readFile(fileName, function (err, data) {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                var xml = data.toString();
                var changes = 0;
                for (var id in values) {
                    var regex = new RegExp("\<string[^\>]*name=\"" + id + "\"[^\>]*\>([\\s\\S]*?)\<\/string\>", "g");
                    var matches = regex.exec(xml);
                    if (matches) {
                        if (matches[1] != values[id]) {
                            var stringElement = matches[0];
                            stringElement = stringElement.replace(">" + matches[1] + "</", ">" + values[id] + "</");
                            xml = xml.replace(regex, stringElement);
                            changes++;
                        }
                    } else {
                        var stringElement = "<string name=\"" + id + "\">" + values[id] + "</string>\n</resources>";
                        xml = xml.replace(/\<\/resources\>/, stringElement.padStart(stringElement.length + $this.identationSpaces));
                        changes++;
                    }
                }
                if (changes) {
                    fs.writeFile(fileName, xml, function (err) {
                        if (err) {
                            console.log(err);
                            reject(err);
                            return;
                        }
                        console.log(languageAndCode + ": " + changes);
                        resolve(1);
                    });
                } else {
                    console.log(languageAndCode + ": NONE");
                    resolve(0);
                }
            });
        });
    }
}