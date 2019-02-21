const constants = require('./constants.js');
const StringData = require('./stringData.js');

module.exports = class AndroidXmlInfo {
    constructor() {
        this.codes = [];
        for(var language in constants.androidLanguageToCode) {
            if(constants.androidLanguageToCode.hasOwnProperty(language)) {
                this.codes = this.codes.concat(constants.androidLanguageToCode[language]);
            }
        }
        this.summary = [];
        this.error = undefined;
        this.fileNames = [];
    }

    countStringIds() {
        return this.summary.length;
    }

    countFileNames() {
        return this.fileNames.length;
    }

    addFileName(fileName) {
        if(this.fileNames.indexOf(fileName) < 0) {
            this.fileNames.push(fileName);
        }
    }

    getCodes() {
        return this.codes;
    }

    getSummary(id) {
        for(var index in this.summary) {
            var stringData = this.summary[index];
            if(stringData.getStringId() == id) {
                return stringData;
            }
        }
        return undefined;
    }

    addSummary(id, code, text, isTranslatable, fileName) {
        var stringData = this.getSummary(id);
        var newId = stringData === undefined;
        if(newId) {
            stringData = new StringData(id);
            this.summary.push(stringData);
        }
        stringData.andIsTranslatable(isTranslatable);
        if(!stringData.addLanguageData(code, text, fileName)) {
            throw new Error("Duplicated text for the same string id (" + id + ") and code (" + code + ")\n" + fileName + "\n" + text);
        }
        return newId;
    }

    validate() {
        for(var index = 0; index < this.summary.length; index++) {
            var stringData = this.summary[index];
            stringData.validate(this.codes);
        }
    }

    report(filterFormatIssues, filterMissingStrings, filterNoDefaultOnly) {
        var count = 0;
        var log = '';
        for(var index = 0; index < this.summary.length; index++) {
            var stringData = this.summary[index];

            var showMissingTranslation = filterMissingStrings && stringData.hasMissingTranslationCodes();
            var showFormatIssue = filterFormatIssues && stringData.hasFormatIssueCodes();
            if(!showMissingTranslation && !showFormatIssue) {
                continue;
            }

            var sdLog = stringData.getStringId();
            if(showMissingTranslation) {
                var showMissing = false;
                var showFound = false;
                if(stringData.hasDefaultLanguageData()) {
                    if(filterNoDefaultOnly) {
                        continue;
                    }
                    sdLog += '\n' + stringData.getDefaultLanguageData().getFileName();
                }
                if(stringData.getIsTranslatable()) {
                    if(stringData.hasDefaultLanguageData()) {
                        if(!stringData.hasFoundTranslationCodes()) {
                            sdLog += '\nNot translated';
                        } else if(stringData.hasMissingTranslationCodes()) {
                            sdLog += '\nMissing translations';
                            showMissing = true;
                        }
                    } else {
                        if(stringData.hasMissingTranslationCodes()) {
                            sdLog += '\nNo default, missing translations';
                            showMissing = true;
                        } else if(stringData.hasFoundTranslationCodes()) {
                            sdLog += '\nNo default, found translations';
                            showFound = true;
                        }
                    }
                } else {
                    sdLog += '\nNot translatable';
                    if(stringData.hasFoundTranslationCodes()) {
                        sdLog += ', found translations';
                        showFound = true;
                    }
                }
                if(showMissing) {
                    sdLog += ' (' + stringData.countMissingTranslationCodes() + '): ' + stringData.getMissingTranslationCodesFormatted();
                } else if(showFound) {
                    sdLog += ' (' + stringData.countFoundTranslationCodes() + '): ' + stringData.getFoundTranslationCodesFormatted();
                }
                if(stringData.hasDefaultLanguageData()) {
                    sdLog += '\n' + stringData.getDefaultLanguageData().getText();
                }
            }
            if(showFormatIssue) {
                sdLog += '\nFormat issues (' + stringData.countFormatIssueCodes() + '): ' + stringData.getFormatCodesFormatted();
            }
            log += (log ? '\n' : '') + sdLog + '\n';
            count++;
        }

        return 'Files read: ' + this.countFileNames() 
            + '\nString ids read: ' + this.countStringIds()
            + '\nString ids with issues: ' + count
            + '\nLanguage codes: ' + this.codes.length
            + '\nTips:'
            + '\n* Strings without English (en) are probably out of use.'
            + '\n* Strings that are only in English are probably awaiting for translation or not supposed to be translated.'
            + '\n  If the later is the case, consider adding "translatable=false" to it.'
            + '\n\n'
            + log;
    }
}