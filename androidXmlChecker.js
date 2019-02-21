const AndroidXmlInfo = require('./androidXmlInfo.js');
var Path = require('path');
var fs = require('fs');

module.exports = class AndroidXmlChecker {
    constructor() {
        this.excelFileName = undefined;
        this.filterMissingStrings = true;
        this.filterFormatIssues = true;
        this.filterNoDefaultOnly = false;
        this.ignoreFiles = [];
        this.outputFileName = undefined;
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

        if(options.ignoreFiles) {
            this.ignoreFiles = options.ignoreFiles.split(',');
        }

        if(options.output !== undefined) {
            this.outputFileName = options.output;
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
        var regex1 = new RegExp("\<string((?:\\s+\\w+=\"\\S*\")+)\\s*\>([\\s\\S]*?)\<\/string\>", "gm");
        var matches1 = undefined;
        var regex2 = new RegExp("\\s+(\\w+)=\"(\\w*?)\"", "gm");
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

        var log = info.report(this.filterFormatIssues, this.filterMissingStrings, this.filterNoDefaultOnly);

        if(this.outputFileName) {
            fs.writeFileSync(this.outputFileName, 'Android xml checker\n\n' + log);
        }

        console.log('\n' + log + '\nDone');
    }
}