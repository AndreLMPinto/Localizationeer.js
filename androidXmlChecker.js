const AndroidXmlInfo = require('./androidXmlInfo.js');
var Path = require('path');
var fs = require('fs');

const regexAllStrings = "\<string((?:\\s+\\w+=\"\\S*\")+)\\s*\>([\\s\\S]*?)\<\/string\>";
const regexAllAttrs = "\\s+(\\w+)=\"(\\w*?)\"";
const regexStringByName = "\<string[^\>]*name=\"{0}\"[^\>]*\>([\\s\\S]*?)\<\/string\>";
const regexStringByNameToDelete = "\\s*" + regexStringByName;
const regexCloseResources = "\<\/resources\>";
const regexModifierGlobal = "g";
const regexModifierMultiGlobal = "gm";

module.exports = class AndroidXmlChecker {
    constructor() {
        this.excelFileName = undefined;
        this.filterMissingStrings = true;
        this.filterFormatIssues = true;
        this.filterNoDefaultOnly = false;
        this.filterNotTranslatedOnly = false;
        this.ignoreFiles = [];
        this.outputFileName = undefined;
        this.paramAction = undefined;
        this.paramId = undefined;
        this.paramSource = undefined;
        this.paramTarget = undefined;
        this.paramForce = false;
        this.paramKeepDefault = false;
        this.identationSpaces = 4;
    }

    validate(options) {
        if(options.xmlsFolderName !== undefined) {
            this.xmlsFolderName = options.xmlsFolderName;
        }

        if(this.xmlsFolderName === undefined || !fs.existsSync(this.xmlsFolderName)) {
            console.log('Please inform the path to the "app/src/main/res" folder containing the values*/strings.xml files.');
            return false;
        }

        if(options.formatIssues === 'false') {
            this.filterFormatIssues = false;
        }

        if(options.missingStrings === 'false') {
            this.filterMissingStrings = false;
        }

        if(options.noDefaultOnly === 'true') {
            this.filterNoDefaultOnly = true;
        }

        if(options.notTranslatedOnly === 'true') {
            this.filterNotTranslatedOnly = true;
        }

        if(options.ignoreFiles) {
            this.ignoreFiles = options.ignoreFiles.split(',');
        }

        if(options.output !== undefined) {
            this.outputFileName = options.output;
        }

        if(options.paramAction !== undefined) {
            this.paramAction = options.paramAction;
            switch(this.paramAction) {
                case 'delete':
                    if (options.paramId !== undefined) {
                        this.paramId = options.paramId;
                    } else {
                        console.log('Please inform the string id (paramId) of the string to be deleted.');
                        return false;
                    }
                    if(options.paramKeepDefault  === 'true') {
                        this.paramKeepDefault = true;
                    }
                    break;
                case 'clone':
                    if (options.paramSource !== undefined) {
                        this.paramSource = options.paramSource;
                    } else {
                        console.log('Please inform the string id (paramSource) of the string to be cloned from.');
                        return false;
                    }
                    if (options.paramTarget !== undefined) {
                        this.paramTarget = options.paramTarget;
                    } else {
                        console.log('Please inform the string id (paramTarget) of the string to be cloned to.');
                        return false;
                    }
                    if(options.paramForce  === 'true') {
                        this.paramForce = true;
                    }
                    break;
            }
        }

        return true;
    }

    getFiles(code)
    {
        var ignoreFiles = this.ignoreFiles;
        var path = Path.join(this.xmlsFolderName, "values" + (code ? "-" + code : "") + Path.sep);
        var files = [];
        fs.readdirSync(path)
            .filter(file => { 
                if(ignoreFiles.find(function(f) { return file === f })) {
                    return false;
                }
                var ext = Path.extname(file);
                return ext === '.xml';
            })
            .forEach(file => {
                files.push(path + file);
            });
        return files;
    }

    readXmls() {
        var info = new AndroidXmlInfo();
        var codes = info.getCodes();
        var regex1 = new RegExp(regexAllStrings, regexModifierMultiGlobal);
        var matches1 = undefined;
        var regex2 = new RegExp(regexAllAttrs, regexModifierMultiGlobal);
        var matches2 = undefined;
        var fileLimit = 0;
        for(var indexCode in codes) {
            var code = codes[indexCode];
            var fileNames = this.getFiles(code);
            fileLimit += fileNames.length;
            for(var indexFileName in fileNames) {
                var fileName = fileNames[indexFileName];
                info.addFileName(fileName);
                var data = fs.readFileSync(fileName);
                var xml = data.toString();
                while((matches1 = regex1.exec(xml)) !== null) {
                    var attrs = matches1[1];
                    var id = undefined;
                    var isTranslatable = true;
                    var text = matches1[2];
                    while((matches2 = regex2.exec(attrs)) !== null) {
                        if(matches2[1] == 'name') {
                            id = matches2[2];
                        } else if(matches2[1] == 'translatable') {
                            isTranslatable = matches2[2] == 'true';
                        }
                    }
                    info.addSummary(id, code, text, isTranslatable, fileName);
                }
                process.stdout.write('Reading files: ' + info.countFileNames() + '/' + fileLimit + '\r');
            }
        }
        return info;
    }

    validateXmls(options) {
        if(!this.validate(options)) {
            return;
        }

        var info = this.readXmls();
        info.validate();

        var log = info.report(this.filterFormatIssues, this.filterMissingStrings, this.filterNoDefaultOnly, this.filterNotTranslatedOnly);

        if(this.outputFileName) {
            fs.writeFileSync(this.outputFileName, 'Android xml checker\n\n' + log);
        }

        console.log('\n' + log + '\nDone');
    }

    delete(fileName) {
        var $this = this;
        return new Promise(function(resolve, reject) {
            fs.readFile(fileName, function(err, data) {
                if (err) {
                    reject(err);
                    return;
                }
                var xml = data.toString();
                var regex = new RegExp($this.format(regexStringByNameToDelete, $this.paramId), regexModifierGlobal);
                var matches = regex.exec(xml);
                if(matches) {
                    xml = xml.replace(matches[0], '');
                    fs.writeFile(fileName, xml, function (err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(1);
                    });
                } else {
                    resolve(0);
                }
            });
        });
    }

    clone(fileName) {
        var $this = this;
        return new Promise(function(resolve, reject) {
            fs.readFile(fileName, function(err, data) {
                if (err) {
                    reject(err);
                    return;
                }
                var xml = data.toString();
                var regex = new RegExp($this.format(regexStringByName, $this.paramSource), regexModifierGlobal);
                var matches = regex.exec(xml);
                if (matches) {
                    var source = matches[0];
                    var target = source.replace('name="' + $this.paramSource + '"', 'name="' + $this.paramTarget + '"');

                    regex = new RegExp($this.format(regexStringByName, $this.paramTarget), regexModifierGlobal);
                    matches = regex.exec(xml);
                    if (matches) {
                        if ($this.paramForce) {
                            xml = xml.replace(regex, target);
                        } else {
                            reject(new Error($this.format('String id "{0}" already in use in the file "{1}".', $this.paramTarget, fileName)));
                            return;
                        }
                    } else {
                        target = target + '\n</resources>';
                        regex = new RegExp(regexCloseResources, regexModifierGlobal);
                        xml = xml.replace(regexCloseResources, target.padStart(target.length + $this.identationSpaces));
                    }
                    fs.writeFile(fileName, xml, function (err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(1);
                    });
                } else {
                    resolve(0);
                }
            });
        });
    }

    format(text) {
        var result = text;
        for(var i = 1; i < arguments.length; i++) {
            result = result.replace('{' + (i-1) + '}', arguments[i]);
        }
        return result;
    }

    exec(action, start, success, error) {
        console.log(start);
        var info = new AndroidXmlInfo();
        var codes = info.getCodes();
        var promises = [];
        for(var indexCode in codes) {
            var code = codes[indexCode];
            if(code === undefined && this.paramKeepDefault) { 
                continue;
            }
            var fileNames = this.getFiles(code);
            for(var indexFileName in fileNames) {
                var fileName = fileNames[indexFileName];
                promises.push(this[action](fileName));
            }
        }
        var $this = this;
        Promise.all(promises).then(function (values) {
            var sum = values.reduce(function(total, number) { 
                return total + number;
            });
            console.log($this.format(success, sum));
        }).catch(function (err) {
            console.log($this.format(error, err));
        });
    }

    executeAction(options) {
        if(!this.validate(options)) {
            return;
        }

        switch(this.paramAction) {
            case 'delete':
                this.exec(this.paramAction,
                    this.format('Delete string with id "{0}".', this.paramId),
                    'Deleted {0} strings.',
                    'Finished with error: {0}');
                break;
            case 'clone':
                this.exec(this.paramAction,
                    this.format('Clone string with id "{0}".', this.paramSource),
                    'Cloned {0} strings.',
                    'Finished with error: {0}');
                break;
            default:
                console.log('Unrecognized action.');
                break;
        }
    }
}