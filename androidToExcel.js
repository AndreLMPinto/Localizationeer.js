const ExcelFileHandler = require('./excel/excelFileHandler');
const ExcelLanguageData = require('./excel/excelLanguageData');
let excelFileHandler = new ExcelFileHandler();
const constants = require('./constants');
var Path = require('path');
var fs = require('fs');

module.exports = class AndroidToExcel {
    constructor() {
        this.xmlsFolderName = undefined;
    }

    validate(options) {
        if (options.xmlsFolderName !== undefined) {
            this.xmlsFolderName = options.xmlsFolderName;
        }

        if (this.xmlsFolderName === undefined || !fs.existsSync(this.xmlsFolderName)) {
            console.log('Please inform the path to the "app/src/main/res" folder containing the values*/strings.xml files.');
            return false;
        }

        return true;
    }
    
    readExcelAndCompleteWithAndroidValues(options) {
        var $this = this;
        if (!$this.validate(options)) {
            return;
        }

        var promises = [];
        options.languageCodesPlatform = constants.android;
        options.idColumnIndex = options.idColumnIndex;
        options.keepEmptyValues = true;

        excelFileHandler.readExcelLanguageData(options, function(err, results) {
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
                        promises.push($this.getValuesFromXml(language, excelLanguageData.values, fileName, code));
                    }
                }
            }

            Promise.all(promises).then(function(values) {
                excelFileHandler.writeExcelLanguageData(options, values,
                    function(err, fileName) {
                        if(err) {
                            console.log('Error ' + err)
                        } else {
                            console.log('Saved to ' + fileName);
                        }
                    });
            }).catch(function (err) {
                console.log('Finished with error ' + err);
            });
        });
    }

    parseStringFormatting(value) {
        if (value) {
            var regex = new RegExp("(\\%\\d\\$s)|(\\%s)","g");
            let matches = value.match(regex);
            if (matches) {
                for (var matchIndex in matches) {
                    if (!isNaN(matchIndex) && matches[matchIndex]) {
                        let match = matches[matchIndex].replace('s','@');
                        value = value.replace(matches[matchIndex], match);
                    }
                }
            }
            value = value
            .replace('?', '\\?')
            .replace('.', '\\.')
            .replace(/\u2018|\u2019|\u201b|\u2032/g, "\'")
            .replace(/\u201c|\u201d|\u2033/g, "\"")
            .replace(/&(?![A-Za-z]+;|#[0-9]+;)/g, "&amp;")
        }
        return value;
    }

    getValuesFromXml(language, values, fileName, code) {
        var languageAndCode = language + (code ? " (" + code + ")" : "");
        var $this = this;
        return new Promise(function (resolve, reject) {
            
            fs.readFile(fileName, function (err, data) {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                var xml = data.toString();
                try {
                    var count = 0;
                    if (xml) {
                        for (var id in values) {
                            try {
                                var regex = new RegExp("\<string[^\>]*name=\"" + id + "\"[^\>]*\>([\\s\\S]*?)\<\/string\>", "g");
                                var matches = regex.exec(xml);
                                if (matches) {
                                    if (matches[1] !== undefined) {
                                        values[id] = matches[1];
                                        count++;
                                    } 
                                }
                            } catch (err) {
                                console.log('regex error' + err);
                            }
                        }
                    }
                    if (count) {
                        console.log(languageAndCode + ': ' + count + ' in ' + xml.length + ' bytes');
                    } else {
                        console.log(languageAndCode + ': ' + xml.length + ' bytes');
                    }
                    resolve(new ExcelLanguageData(language, [code], values))
                } catch (parseError) {
                    console.log(parseError);
                    reject(parseError);
                    return;
                }
            });
        });
    }
}