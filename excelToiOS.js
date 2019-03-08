const ExcelFileReader = require('./excel/excelFileReader');
let excelFileReader = new ExcelFileReader();
var Path = require('path');
var fs = require('fs');
const xliff12ToJs = require('xliff/xliff12ToJs');
const jsToXliff12 = require('xliff/jsToXliff12');

// The following code is based on the analogous class from the C# version of this project.
module.exports = class ExcelToiOS {
    constructor() {
        this.xmlsFolderName = undefined;
        this.identationSpaces = 4;
    }

    sanityze(text) {
        return text.trim().replace(/\'/g, "\\\'");
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
                        var fileName = Path.join($this.xmlsFolderName, (code ? code : "") + ".xliff");
                        var languageAndCode = language + (code ? " (" + code + ")" : "");
                        promises.push($this.setValuesInXml(languageAndCode, excelLanguageData.values, fileName));
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

    findAndReplaceInXliff(parsedXliff, id, value) {
        let resources = parsedXliff.resources;
        let resourcesKeys = Object.keys(resources);
        for (var resourcesKeyIndex in resourcesKeys) {
            let resourceKey = resourcesKeys[resourcesKeyIndex];
            let resource = resources[resourceKey];
            let transUnitKeys = Object.keys(resource);
            for (var transUnitKeyIndex in transUnitKeys) {
                let transUnitKey = transUnitKeys[transUnitKeyIndex];
                let transUnit = resource[transUnitKey];
                if (transUnit.source === id && transUnit.target !== value) {
                    transUnit.target = value;
                    return 1;
                }
            }
        }
        return 0;
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
                var xliff = data.toString();
                try {
                    let parsedXliff = xliff12ToJs(xliff);

                    var changes = 0;
                    for (var id in values) {
                        let parsedValue = $this.parseStringFormatting(values[id]);
                        let parsedId = $this.parseStringFormatting(id);
                        changes += $this.findAndReplaceInXliff(parsedXliff, parsedId, parsedValue);
                    }
                    if (changes) {
                        jsToXliff12(parsedXliff, {}, function (parseXliffError, modifiedXliff) {
                            if (parseXliffError) {
                                console.log(parseXliffError);
                                reject(parseXliffError);
                                return;
                            }
                            fs.writeFile(fileName, modifiedXliff, function (err) {
                                if (err) {
                                    console.log(err);
                                    reject(err);
                                    return;
                                }
                                console.log(languageAndCode + ": " + changes);
                                resolve();
                            });
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