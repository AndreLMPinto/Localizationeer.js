const constants = require('../constants');
const ExcelLanguageData = require('./excelLanguageData');
var Excel = require('exceljs');
var fs = require('fs');
var Path = require('path');

//This will read excel and send the values extracted through the callback
module.exports = class ExcelFileReader {

    constructor() {
        this.idColumnIndex = 1;
        this.englishColumnIndex = 2;
        this.excelFileName = undefined;
        this.languageCodesPlatform = undefined;
    }

    sanityze(text) {
        return text.trim().replace(/\'/g, "\\\'");
    }

    validate(options) {
        if (options.idColumnIndex !== undefined) {
            this.idColumnIndex = options.idColumnIndex;
        }
        if (options.englishColumnIndex !== undefined) {
            this.englishColumnIndex = options.englishColumnIndex;
        }
        if (options.excelFileName !== undefined) {
            this.excelFileName = options.excelFileName;
        }

        if (options.languageCodesPlatform !== undefined) {
            this.languageCodesPlatform = options.languageCodesPlatform;
        }

        if (this.excelFileName === undefined || !fs.existsSync(this.excelFileName)) {
            console.log('Please inform the path to the Excel file containing string ids and localized strings.');
            return false;
        }

        if (this.languageCodesPlatform === undefined) {
            console.log('Please inform the target platform to get language codes.');
            return false;
        }

        return true;
    }

    mapLanguageToCodes(language) {
        if (this.languageCodesPlatform === 'android') {
            return constants.androidLanguageToCode[language];
        }
        if (this.languageCodesPlatform === 'ios') {
            return constants.iosLanguageToCode[language];
        }

        return null;
    }

    readExcelLanguageData(options, callback) {
        var $this = this;
        if (!$this.validate(options)) {
            return;
        }

        var workbook = new Excel.Workbook();
        var reader = workbook.xlsx;
        var readerOptions = null;
        var ext = Path.extname($this.excelFileName);
        if(ext === '.csv') {
            reader = workbook.csv;
            readerOptions = {
                headers: false,
                ignoreEmpty: true,
                delimiter: ';',
                quote: '"',
                escape: '"',
                trim: true,
                comment: '#',
                map: function(value, index) {
                    return value;
                }
            };
        }
        reader.readFile($this.excelFileName, readerOptions)
            .then(function () {
                var worksheet = workbook.worksheets[0];

                if (worksheet.getCell(1, $this.englishColumnIndex).text != 'English') {
                    throw new Error('Incorrect index for "English" column. Please review your Excel file.');
                }

                var totalRows = worksheet.rowCount;
                var totalCols = worksheet.columnCount;
                var results = [];
                for (var col = $this.englishColumnIndex; col < totalCols; col++) {
                    // get the language name from the excel column title
                    var language = worksheet.getCell(1, col).text;
                    // maps the language name to one or more language codes
                    var languageCodes = $this.mapLanguageToCodes(language);
                    if (languageCodes) {
                        var values = {};
                        // read all strings for one language from the excel file
                        for (var row = 2; row <= totalRows; row++) {
                            var id = worksheet.getCell(row, $this.idColumnIndex).text;
                            if (id) {
                                if (values[id]) {
                                    throw new Error('Duplicate key detected "' + id + '". Please review your Excel file.')
                                }
                                var value = $this.sanityze(worksheet.getCell(row, col).text);
                                if (value) {
                                    values[id] = value;
                                }
                            }
                        }

                        if (Object.keys(values).length) {
                            let result = new ExcelLanguageData(language, languageCodes, values);
                            results.push(result);
                        }
                    }
                }

                if (results) {
                    callback(null, results);
                }
            })
            .catch(function (err) {
                callback(err);
            });
    }
};