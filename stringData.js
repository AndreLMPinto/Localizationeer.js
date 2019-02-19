const LanguageData = require('./languageData.js');

module.exports = class StringData {
    constructor(stringId) {
        this._stringId = stringId;
        this._isTranslatable = true;
        this._languageData = [];
        this._formatIssueCodes = [];
        this._missingTranslationCodes = [];
        this._foundTranslationCodes = [];
    }

    getStringId() {
        return this._stringId;
    }
    getIsTranslatable() {
        return this._isTranslatable;
    }
    andIsTranslatable(value) {
        this._isTranslatable &= value;
    }
    getArrayFormatted(arr) {
        var text = '';
        for(var i = 0; i < arr.length; i++) {
            if(text !== '') {
                text += ', ';
            }
            text += arr[i] ? arr[i] : 'en';
        }
        return text;
    }
    getLanguageDataWithCode(code) {
        for(var index in this._languageData) {
            var languageData = this._languageData[index];
            if(languageData && languageData.getCode() === code) {
                return languageData;
            }
        }
        return undefined;
    }
    addLanguageData(code, text, fileName) {
        var languageData = this.getLanguageDataWithCode(code);
        if(languageData) {
            return languageData.getText() === text && languageData.getFileName() === fileName;
        } else {
            var languageData = new LanguageData(code, text, fileName);
            this._languageData.push(languageData);
            return true;
        }
    }
    languageDataHasCode(code) {
        return this.getLanguageDataWithCode(code) !== undefined;
    }
    getDefaultLanguageData() {
        return this.getLanguageDataWithCode(undefined);
    }
    hasDefaultLanguageData() {
        return this.getDefaultLanguageData() !== undefined;
    }
    countFormatIssueCodes() {
        return this._formatIssueCodes.length;
    }
    hasFormatIssueCodes() {
        return this.countFormatIssueCodes() > 0;
    }
    getFormatCodesFormatted() {
        return this.getArrayFormatted(this._formatIssueCodes);
    }
    countMissingTranslationCodes() {
        return this._missingTranslationCodes.length;
    }
    hasMissingTranslationCodes() {
        return this.countMissingTranslationCodes() > 0;
    }
    getMissingTranslationCodesFormatted() {
        return this.getArrayFormatted(this._missingTranslationCodes);
    }
    countFoundTranslationCodes() {
        return this._foundTranslationCodes.length;
    }
    hasFoundTranslationCodes() {
        return this.countFoundTranslationCodes() > 0;
    }
    getFoundTranslationCodesFormatted() {
        return this.getArrayFormatted(this._foundTranslationCodes);
    }
    validate(codes) {
        // missing/found translations
        if(codes.length != this._languageData.length) {
            for(var idxCode in codes) {
                var code = codes[idxCode];
                if(!this.languageDataHasCode(code)) {
                    this._missingTranslationCodes.push(code);
                } else if(code) {
                    this._foundTranslationCodes.push(code);
                }
            }
        }
        // formatting messed up
        if(this.hasDefaultLanguageData()) {
            var en = this.getLanguageDataWithCode();
            for(var idxLanguageData in this._languageData) {
                var languageData = this._languageData[idxLanguageData];
                if(languageData.getCode()) {
                    if(en.getSpecifiers().length != languageData.getSpecifiers().length) {
                        this._formatIssueCodes.push(languageData.getCode());
                    }
                }
            }
        }
    }
}