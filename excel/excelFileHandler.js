const constants = require('../constants');
const ExcelLanguageData = require('./excelLanguageData');
var Excel = require('exceljs');
var fs = require('fs');
var Path = require('path');

//This will read excel and send the values extracted through the callback
module.exports = class ExcelFileHandler {

    constructor() {
        this.idColumnIndex = 1;
        this.englishColumnIndex = 2;
        this.excelFileName = undefined;
        this.languageCodesPlatform = undefined;
        this.keepEmptyValues = false;
        this.includeEnglish = false;
    }

    sanityze(text) {
        // left double quotation mark \u201c
        // right double quotation mark \u201d
        // double prime \u2033

        // left single quotation mark \u2018
        // right single quotation mark \u2019
        // single high-reversed-9 quotation mark \u201b
        // prime \u2032

        // replace lonely & with &amp;
        // ignores &amp; &lt; and so

        if (this.languageCodesPlatform && this.languageCodesPlatform === constants.ios) {
            return text.trim()
                .replace(/&(?![A-Za-z]+;|#[0-9]+;)/g, "&amp;")
                .replace(/\r\n/g, "\n");
        } else {
            return text.trim()
                .replace(/\'|\u2018|\u2019|\u201b|\u2032/g, "\\\'")
                .replace(/\"|\u201c|\u201d|\u2033/g, "\\\"")
                .replace(/\r\n/g, "\\n")
                .replace(/&(?![A-Za-z]+;|#[0-9]+;)/g, "&amp;");
        }
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

        if (options.keepEmptyValues) {
            this.keepEmptyValues = options.keepEmptyValues;
        }

        if (options.includeEnglish) {
            this.includeEnglish = options.includeEnglish;
        }

        return true;
    }

    mapLanguageToCodes(language) {
        if (this.languageCodesPlatform === constants.android) {
            return constants.androidLanguageToCode[language];
        }
        if (this.languageCodesPlatform === constants.ios) {
            return constants.iosLanguageToCode[language];
        }

        return null;
    }

    // writes a list of excelLanguageData into the localization excel file
    // callback returns the file name of the localization excel file
    writeExcelLanguageData(options, list, callback) {
        var $this = this;
        if (!$this.validate(options)) {
            return;
        }

        var workbook = new Excel.Workbook();
        workbook.xlsx.readFile($this.excelFileName)
        .then(function() {
            var worksheet = workbook.worksheets[0];
            var totalRows = worksheet.rowCount;
            var totalCols = worksheet.columnCount;
            for (var index in list) {
                var item = list[index];
                var col = $this.getLanguageColumn(worksheet, item.language);
                if (col == $this.englishColumnIndex && !$this.includeEnglish) {
                    continue;
                }
                for (var id in item.values) {
                    var row = $this.getIdRow(worksheet, id);
                    if (col && row && item.values[id]) {
                        worksheet.getCell(row, col).value = item.values[id];
                    }
                }
            }
            var fileName = $this.createNewFileName($this.excelFileName);
            workbook.xlsx.writeFile(fileName)
            .then(function(){
                callback(null, fileName);
            })
            .catch(function(err){
                callback(err);
            });
        })
        .catch(function(err){
            callback(err);
        });
    }

    createNewFileName(fileName) {
        var count = 0;
        var path;
        do {
            count++;
            path = fileName.replace('.xlsx', '_' + count + '.xlsx');
        } while (fs.existsSync(path))
        return path;
    }

    getIdRow(worksheet, id) {
        var totalRows = worksheet.rowCount;
        for (var row = 1; row <= totalRows; row++) {
            if (worksheet.getCell(row, this.idColumnIndex).text == id) {
                return row;
            }
        }
        return 0;
    }

    getLanguageColumn(worksheet, language) {
        var totalCols = worksheet.columnCount;
        for (var col = 1; col <= totalCols; col++) {
            if (worksheet.getCell(1, col).text == language) {
                return col;
            }
        }
        return 0;
    }

    // reads the localization excel file into a list of excelLanguageData
    // callback returns the list of excelLanguageData
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
                for (var col = $this.englishColumnIndex; col <= totalCols; col++) {
                    // get the language name from the excel column title
                    var language = worksheet.getCell(1, col).text;
                    // maps the language name to one or more language codes
                    var languageCodes = $this.mapLanguageToCodes(language);
                    if (languageCodes) {
                        var values = {};
                        // read all strings for one language from the excel file
                        for (var row = 2; row <= totalRows; row++) {
                            var id = $this.sanityze(worksheet.getCell(row, $this.idColumnIndex).text);
                            if (id) {
                                if (values[id]) {
                                    throw new Error('Duplicate key detected "' + id + '". Please review your Excel file.')
                                }
                                var value = $this.sanityze(worksheet.getCell(row, col).text);
                                if (value) {
                                    values[id] = value;
                                } else if ($this.keepEmptyValues) {
                                    values[id] = undefined;
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