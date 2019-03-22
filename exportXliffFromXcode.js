const constants = require('./constants');
let spawn = require('child_process').spawn;

/*
xcodebuild 
-exportLocalizations 
-localizationPath ./localizations/path/to/be/exported 
-project MyApp/MyApp.xcodeproj 
-exportLanguage pt-BR
*/
function runXcodeBuildExport(langCode, options) {
    return new Promise(function (resolve, reject) {
        console.log('Running xcodebuild -exportLocalizations for ' + langCode);
        let xcodebuildSpawn = spawn('xcodebuild', [
            '-exportLocalizations'
            , '-localizationPath', options.localizationPath
            , '-project', options.xcodeProjPath
            , '-exportLanguage', langCode
        ]);
        xcodebuildSpawn.on('exit', function (code) {
            if (code) {
                console.log('xcodebuild finished with error! Exit code: ' + code);
                reject(new Error('xcodebuild finished with error! Exit code: ' + code));
            } else {
                resolve();
            }
        });
        xcodebuildSpawn.stdout.on('data', function (data) {
            console.log(data);
        });
        xcodebuildSpawn.stderr.on('data', function (data) {
            console.log('Error: '+ data);
        })
    });
    
}

/*
options = {
    localizationPath: '/Path/to/where/it/will/export/xliffs',
    xcodeProjPath: '/Path/to/where/the/xcodeproj/is/App.xcodeproj'
}
*/
module.exports.exportXliffFromXcode = function (options) {
    console.log('Exporting localization from ' + options.xcodeProjPath);
    console.log('Exporting to folder: ' + options.localizationPath);

    let promises = [];

    let languagesKeys = Object.keys(constants.iosLanguageToCode);
    for (let languagesKeyIndex in languagesKeys) {
        let languageCodes = constants.iosLanguageToCode[languagesKeys[languagesKeyIndex]];
        for (let langCodeIndex in languageCodes) {
            let langCode = languageCodes[langCodeIndex];
            promises.push(runXcodeBuildExport(langCode, options));
        }
    }

    Promise.all(promises).then(function () {
        console.log('Finished');
    }).catch(function (error) {
        console.log('Finished with error ' + error);
    })
}