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

    validate(filterFormatIssues, filterMissingStrings) {
        var count = 0;
        var log = '';
        for(var index = 0; index < this.summary.length; index++) {
            var stringData = this.summary[index];
            stringData.validate(this.codes);

            if(stringData.hasMissingTranslationCodes() || stringData.hasFormatIssueCodes()) {
                count++;
            }

            var showMissingTranslation = filterMissingStrings && stringData.hasMissingTranslationCodes();
            var showFormatIssue = filterFormatIssues && stringData.hasFormatIssueCodes();
            if(!showMissingTranslation && !showFormatIssue) {
                continue;
            }
            log += (log ? '\n\n' : '\n') + stringData.getStringId();
            if(showMissingTranslation) {
                var showMissing = false;
                var showFound = false;
                if(stringData.hasDefaultLanguageData()) {
                    log += '\n' + stringData.getDefaultLanguageData().getFileName();
                }
                if(stringData.getIsTranslatable()) {
                    if(stringData.hasDefaultLanguageData()) {
                        if(!stringData.hasFoundTranslationCodes()) {
                            log += '\nNot translated';
                        } else if(stringData.hasMissingTranslationCodes()) {
                            log += '\nMissing translations';
                            showMissing = true;
                        }
                    } else {
                        if(stringData.hasMissingTranslationCodes()) {
                            log += '\nNo default, missing translations';
                            showMissing = true;
                        } else if(stringData.hasFoundTranslationCodes()) {
                            log += '\nNo default, found translations';
                            showFound = true;
                        }
                    }
                } else {
                    log += '\nNot translatable';
                    if(stringData.hasFoundTranslationCodes()) {
                        log += ', found translations';
                        showFound = true;
                    }
                }
                if(showMissing) {
                    log += ' (' + stringData.countMissingTranslationCodes() + '): ' + stringData.getMissingTranslationCodesFormatted();
                } else if(showFound) {
                    log += ' (' + stringData.countFoundTranslationCodes() + '): ' + stringData.getFoundTranslationCodesFormatted();
                }
                if(stringData.hasDefaultLanguageData()) {
                    log += '\n' + stringData.getDefaultLanguageData().getText();
                }
            }
            if(showFormatIssue) {
                log += '\nFormat issues (' + stringData.countFormatIssueCodes() + '): ' + stringData.getFormatCodesFormatted();
            }
            console.log(log);
        }
        if(count) {
            log = '\nString ids with issues: ' + count;
            if(filterMissingStrings) {
                log += '\nLanguage codes: ' + this.codes.length
                    + '\nTips:'
                    + '\n* Strings without English (en) are probably out of use.'
                    + '\n* Strings that are only in English are probably awaiting for translation or not supposed to be translated.'
                    + '\n  If the later is the case, consider adding "translatable=false" to it.'
            }
            console.log(log);
        }
    }
}