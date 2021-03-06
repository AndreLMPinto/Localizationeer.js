const ExcelFileHandler = require('./excel/excelFileHandler');
const ExcelLanguageData = require('./excel/excelLanguageData');
let excelFileHandler = new ExcelFileHandler();
const constants = require('./constants');
var Path = require('path');
var fs = require('fs');

module.exports = class IosToExcel {
    constructor() {
        this.xmlsFolderName = undefined;
    }

    validate(options) {
        if (options.xmlsFolderName !== undefined) {
            this.xmlsFolderName = options.xmlsFolderName;
        }

        if (this.xmlsFolderName === undefined || !fs.existsSync(this.xmlsFolderName)) {
            console.log('Please inform the path to the folder containing the xliff files.');
            return false;
        }

        return true;
    }
    
    readExcelAndCompleteWithIosValues(options) {
        var $this = this;
        if (!$this.validate(options)) {
            return;
        }

        var promises = [];
        options.languageCodesPlatform = constants.ios;
        options.idColumnIndex = options.englishColumnIndex;
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
                        var fileName = Path.join($this.xmlsFolderName, (code ? code : ""));
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

    sanytizeId(value) {
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
                // characters used in regular expression must be escaped
                // TODO: might need to add more as it goes []{}*+|^$\
                .replace(/\?/g, '\\?')
                .replace(/\./g, '\\.')
                .replace(/\)/g, '\\)')
                .replace(/\(/g, '\\(')
                // leave the quotations untouched
                //.replace(/\u2018|\u2019|\u201b|\u2032/g, "\'")
                //.replace(/\u201c|\u201d|\u2033/g, "\"")
                // leave the ampersand untouched
                // TODO: need to test this to confirm
                //.replace(/&(?![A-Za-z]+;|#[0-9]+;)/g, "&amp;")
                .trim();
        }
        return value;
    }

    getValuesFromXml(language, values, fileName, code) {
        var languageAndCode = language + (code ? " (" + code + ")" : "");
        var $this = this;
        return new Promise(function (resolve, reject) {
            if (!fs.existsSync(fileName + constants.XLIFF_SUFFIX)) {
                if (fs.existsSync(fileName + constants.XCLOC_SUFFIX)) {
                    fileName = fileName + constants.XCLOC_SUFFIX + '/Localized\ Contents/' + code + constants.XLIFF_SUFFIX;
                } else {
                    console.log('File ' + fileName + ' not found');
                    reject(new Error('File ' + fileName + ' not found'));
                    return;
                }
            } else {
                fileName = fileName + constants.XLIFF_SUFFIX;
            }

            fs.readFile(fileName, function (err, data) {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                var xliff = data.toString();
                try {
                    var count = 0;
                    if (xliff) {
                        for (var id in values) {
                            let parsedId = $this.sanytizeId(id);
                            try {
                                var regex = new RegExp("\<source\>" + parsedId + "\<\/source\>([^\>]*\<target\>([\\s\\S]*?)\<\/target\>)?", "gi");
                                var matches = regex.exec(xliff);
                                if (matches) {
                                    if (matches[1] === undefined) {
                                        values[id] = undefined;
                                    } else if (matches[2]) {
                                        values[id] = matches[2];
                                        count++;
                                    } 
                                }
                            } catch (err) {
                                console.log('regex error' + err);
                            }
                        }
                    }
                    if (count) {
                        console.log(languageAndCode + ': ' + count + ' in ' + xliff.length + ' bytes');
                    } else {
                        console.log(languageAndCode + ': ' + xliff.length + ' bytes');
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