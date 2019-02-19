module.exports = class LanguageData {
    constructor(code, text, fileName) {
        this._code = code;
        this._fileName = fileName;
        this.setText(text);
    }

    getCode() {
        return this._code;
    }

    getText() {
        return this._text;
    }

    setText(text) {
        this._text = text;
        this._specifiers = [];
        var regex = new RegExp("%(\\d\\$)*[ds]", "g");
        var matches = undefined;
        while((matches = regex.exec(text)) !== null) {
            this._specifiers.push(matches[0]);
        }
    }

    getSpecifiers() {
        return this._specifiers;
    }

    getFileName() {
        return this._fileName;
    }
}