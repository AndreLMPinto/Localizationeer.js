const puppeteer = require('puppeteer');
const constants = require('./constants');
const ExcelFileHandler = require('./excel/excelFileHandler');
const ExcelLanguageData = require('./excel/excelLanguageData');
let excelFileHandler = new ExcelFileHandler();
const browserVisible = { headless: false, slowMo: 250 };
const browserInvisible = {};
var browserOptions = browserInvisible;
var delayMinVariation = 2000;
var delayMaxVariation = 5000;
function getDelay() {
    return Math.floor(Math.random() * (delayMaxVariation - delayMinVariation + 1)) + delayMinVariation;
}

module.exports = class TranslateGoogle {
    constructor() {

    }

    validate(options) {
        this.source = 'en';
        if (options.paramSource !== undefined) {
            this.source = options.paramSource;
        }

        if (options.paramTarget === undefined) {
            console.log('Please inform target language code.');
            return false;
        }
        this.target = options.paramTarget;

        if (options.paramText === undefined) {
            console.log('Please inform string to translate.');
            return false;
        }
        this.text = options.paramText;

        return true;
    }

    translateOnePage(page, source, target, text) {
        return new Promise(
            function(resolve, reject) {
                // create url for translation
                var url = 'https://translate.google.com/#view=home&op=translate&sl=' + source
                + '&tl=' + target
                + '&text=' + text.replace(/ /g, '%20').replace(/%s/g, '{-}');
                // %s should be escaped to %25s, but google translator dont work
                // i found out {-} goes untouched through google translator, so i used it instead
                //console.log(url);
                page.goto(url).then(
                    function() {
                        // standby for a moment...
                        page.waitFor(getDelay()).then(
                            function() {
                                // looks for the translation result
                                page.$eval(
                                    'span[class="tlid-translation translation"]', 
                                    function(e) { 
                                        return e.innerHTML; 
                                    }
                                ).then(
                                    function(t) {
                                        // sanitize the result (removes html code)
                                        t = t.replace(/(<([^>]+)>)/ig, '').replace(/&amp;/ig, '&').replace(/{-}/ig, '%s');
                                        //console.log(source + '[' + text + '] -> ' + target + '[' + t + ']');
                                        resolve(t);
                                    }
                                ).catch(
                                    function(err) {
                                        throw(err);
                                    }
                                );
                            }
                        ).catch(
                            function(err) {
                                throw(err);
                            }
                        );
                    }
                ).catch(
                    function(err) {
                        console.log('Failed translating ' + source + ' [' + text + '] -> ' + target);
                        reject(err);
                    }
                );
            }
        );
    }

    translateOne(options) {
        var $this = this;
        if (!$this.validate(options)) {
            return;
        }

        // use puppeteer to open headless browser
        puppeteer.launch(browserOptions).then(
            function(browser) {
                // then open a new page
                browser.newPage().then(
                    function(page) {
                        // in that page navigate to the translation url
                        return $this.translateOnePage(page, $this.source, $this.target, $this.text);
                    }
                ).then(
                    function(t) {
                        console.log($this.source + '[' + $this.text + '] -> ' + $this.target + '[' + t + ']');
                        browser.close();
                        console.log('Done');
                    }
                ).catch(
                    function(err) {
                        browser.close();
                        throw(err);
                    }
                )
            }
        ).catch(
            function(err) {
                console.log(err);
            }
        );
    }

    translateBatch(options) {
        var $this = this;

        var promises = [];
        options.languageCodesPlatform = constants.google;
        options.keepEmptyValues = true;

        console.log('Reading Excel file');
        excelFileHandler.readExcelLanguageData(options, 
            function(err, results) {
                if (err) {
                    console.log(err);
                    return;
                }

                if (results) {
                    console.log('Preparing strings');
                    var enLanguageData;
                    for (var resultsIndex in results) {
                        let excelLanguageData = results[resultsIndex];
                        for (var index in excelLanguageData.languageCodes) {
                            var code = excelLanguageData.languageCodes[index];
                            if (code == 'en') {
                                enLanguageData = excelLanguageData;
                                break;
                            }
                        }
                        if (enLanguageData) {
                            break;
                        }
                    }

                    for (var resultsIndex in results) {
                        let excelLanguageData = results[resultsIndex];
                        for (var index in excelLanguageData.languageCodes) {
                            var code = excelLanguageData.languageCodes[index];
                            if (code != 'en') {
                                for (var id in enLanguageData.values) {
                                    var value = enLanguageData.values[id];
                                    promises.push({ source: 'en', target: code, text: value, id: id, index: resultsIndex });
                                }
                            }
                        }
                    }
                }

                console.log('Opening browser')
                puppeteer.launch(browserOptions).then(
                    function(browser) {
                        console.log('Opening page')
                        browser.newPage().then(
                            function(page) {
                                console.log('Translating strings')
                                promises.reduce(
                                    function(total, currentValue, currentIndex, arr) {
                                        return total.then(
                                            function() {
                                                //console.log('Translating: ' + (currentIndex + 1) + '/' + arr.length);
                                                process.stdout.write('\rTranslating: ' + (currentIndex + 1) + '/' + arr.length + (currentIndex == arr.length - 1?'\n':''));
                                                return $this.translateOnePage(page, currentValue.source, currentValue.target, currentValue.text
                                                ).then(
                                                    function(t) {
                                                        results[currentValue.index].values[currentValue.id] = t;
                                                        return Promise.resolve();
                                                    }
                                                ).catch(
                                                    function(err) {
                                                        console.log(err)
                                                    }
                                                );
                                            }
                                        );
                                    }, 
                                    Promise.resolve()
                                ).then(
                                    function() {
                                        console.log('Closing browser');
                                        browser.close();
                                        excelFileHandler.writeExcelLanguageData(options, results,
                                            function(err, fileName) {
                                                if(err) {
                                                    console.log('Error ' + err)
                                                } else {
                                                    console.log('Saved to ' + fileName);
                                                }
                                            }
                                        );
                                    }
                                ).catch(
                                    function(err) {
                                        browser.close();
                                        throw(err);
                                    }
                                );
                            }
                        );
                    }
                ).catch(
                    function(err) {
                        console.log(err);
                        throw(err);
                    }
                );
            }
        );
    }

    translate(options) {
        browserOptions = options.paramHeadless == 'no' ? browserVisible : browserInvisible;
        if (options.paramSource == 'excel') {
            this.translateBatch(options);
        } else {
            this.translateOne(options);
        }
    }
}