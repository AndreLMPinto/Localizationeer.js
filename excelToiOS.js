const ExcelFileReader = require('./excel/excelFileReader');
let excelFileReader = new ExcelFileReader();
var Path = require('path');
var fs = require('fs');
const xliff12ToJs = require('xliff/xliff12ToJs');
const jsToXliff12 = require('xliff/jsToXliff12');

const XLIFF_SUFFIX = '.xliff';
const XCLOC_SUFFIX = '.xcloc';

// The following code is based on the analogous class from the C# version of this project.
module.exports = class ExcelToiOS {
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
            console.log('Please inform the path to the folder containing the xliff files.');
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
        options.languageCodesPlatform = 'ios';
        options.idColumnIndex = options.englishColumnIndex;

        excelFileReader.readExcelLanguageData(options, function (err, results) {
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
                        var languageAndCode = language + (code ? " (" + code + ")" : "");
                        promises.push($this.setValuesInXml(languageAndCode, excelLanguageData.values, fileName, code));
                    }
                }
            }

            Promise.all(promises).then(function () {
                console.log('Finished');
            }).catch(function (err) {
                console.log('Finished with error ' + err);
            });
        });
    }

    parseStringFormatting(value) {
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
        return value;
    }

    setValuesInXml(languageAndCode, values, fileName, code) {
        var $this = this;
        return new Promise(function (resolve, reject) {
            if (!fs.existsSync(fileName + XLIFF_SUFFIX)) {
                if (fs.existsSync(fileName + XCLOC_SUFFIX)) {
                    fileName = fileName + XCLOC_SUFFIX + '/Localized\ Contents/' + code + XLIFF_SUFFIX;
                } else {
                    console.log('File ' + fileName + ' not found');
                    reject(new Error('File ' + fileName + ' not found'));
                    return;
                }
            } else {
                fileName = fileName + XLIFF_SUFFIX;
            }
            
            fs.readFile(fileName, function (err, data) {
                if (err) {
                    console.log(err);
                    reject(err);
                    return;
                }
                var xliff = data.toString();
                try {
                    var changes = 0;
                    for (var id in values) {
                        let parsedValue = $this.parseStringFormatting(values[id]);
                        let parsedId = $this.parseStringFormatting(id);
                        
                        try {
                            var regex = new RegExp("\<source\>" + parsedId.trim() + "\<\/source\>([^\>]*\<target\>([\\s\\S]*?)\<\/target\>)?", "g");
                                    var matches = regex.exec(xliff);
                                    if (matches) {
                                        var stringElement = matches[0];
                                        if (matches[1] === undefined) {
                                            stringElement = stringElement.replace("</source>", "</source>\n<target>"+parsedValue+"</target>");
                                            xliff = xliff.replace(regex, stringElement);
                                            changes++;
                                        } else if (matches[2] != parsedValue) {
                                            stringElement = stringElement.replace(">" + matches[1] + "</", ">" + parsedValue + "</");
                                            xliff = xliff.replace(regex, stringElement);
                                            changes++;
                                        } 
                                    }
                        } catch (err) {
                            console.log('regex error' + err);
                        }
                    }
                    if (changes) {
                        fs.writeFile(fileName, xliff, function (err) {
                            if (err) {
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
                } catch (parseError) {
                    console.log(parseError);
                    reject(parseError);
                    return;
                }
            });
        });
    }
}