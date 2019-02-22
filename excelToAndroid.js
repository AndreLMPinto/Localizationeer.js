const ReadExcelFile = require('./excel/readExcelFile');
let readExcelFile = new ReadExcelFile();
var Path = require('path');
var fs = require('fs');

// The following code is based on the analogous class from the C# version of this project.
module.exports = class ExcelToAndroid {
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
        if(options.xmlsFolderName !== undefined) {
            this.xmlsFolderName = options.xmlsFolderName;
        }

        if(this.xmlsFolderName === undefined || !fs.existsSync(this.xmlsFolderName)) {
            console.log('Please inform the path to the "app/src/main/res" folder containing the values*/strings.xml files.');
            return false;
        }

        return true;
    }

    readExcelAndApplyNewValues(options) {
        var $this = this;
        if(!$this.validate(options)) {
            return;
        }

        var promises = [];
        options.languageCodesPlatform = 'android';

        readExcelFile.readExcelAndApplyNewValues(options, function(err, results) {
            if (err) {
                console.log(err);
                return;
            }

            if (results) {
                for (var resultsIndex in results) {
                    let result = results[resultsIndex];
                    if (result && Object.keys(result).length) {
                            let language = result.language;
                            for(var index in result.languageCodes) {
                                var code = result.languageCodes[index];
                                var fileName = Path.join($this.xmlsFolderName, "values" + (code ? "-" + code : "") + Path.sep + "strings.xml");
                                var languageAndCode = language + (code ? " (" + code + ")": "");
                                promises.push($this.setValuesInXml(languageAndCode, result.values, fileName));
                            }
                        
                    }
                }
            }

            Promise.all(promises).then(function() {
                console.log('Finished');
            }).catch(function (err) {
                console.log('Finished with error ' + err);
            });
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