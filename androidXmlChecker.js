const AndroidXmlInfo = require('./androidXmlInfo.js');
var Path = require('path');
var fs = require('fs');

module.exports = class AndroidXmlChecker {
    constructor() {
        this.excelFileName = undefined;
        this.filterMissingStrings = true;
        this.filterFormatIssues = true;
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

        return true;
    }

    getFiles(code)
    {
        var path = Path.join(this.xmlsFolderName, "values" + (code ? "-" + code : "") + Path.sep);
        var files = [];
        fs.readdirSync(path)
            .filter(file => {
                var ext = Path.extname(file);
                return ext === '.xml';
            })
            .forEach(file => {
                files.push(path + file);
            });
        return files;
    }

    validateXmls(options) {
        if(!this.validate(options)) {
            return;
        }

        var info = new AndroidXmlInfo();
        var codes = info.getCodes();
        var regex1 = new RegExp("\<string((?:\\s+\\w+=\"\\S*\")+)\\s*\>([\\s\\S]*?)\<\/string\>", "gm");
        var matches1 = undefined;
        var regex2 = new RegExp("\\s+(\\w+)=\"(\\w*?)\"", "gm");
        var matches2 = undefined;
        var fileCount = 0;
        var fileLimit = 0;
        var stringCount = 0;
        for(var indexCode in codes) {
            var code = codes[indexCode];
            var fileNames = this.getFiles(code);
            fileLimit += fileNames.length;
            for(var indexFileName in fileNames) {
                var fileName = fileNames[indexFileName];
                fileCount++;
                process.stdout.write('Reading files: ' + fileCount + '/' + fileLimit + '\r');
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
                    if(info.addSummary(id, code, text, isTranslatable, fileName)) {
                        stringCount++;
                    }                
                }
            }
        }
        console.log('\nFiles read: ' + fileLimit + '\nString ids read: ' + stringCount);
        info.validate(this.filterFormatIssues, this.filterMissingStrings);
    }
}