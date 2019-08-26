const constants = require('./constants');
let spawn = require('child_process').spawn;

/*
xcodebuild 
-importLocalizations 
-localizationPath ./localizations/path/to/be/exported 
-project MyApp/MyApp.xcodeproj 
-exportLanguage pt-BR
*/
async function runXcodeBuildImport(langCode, options) {
    return new Promise(function (resolve, reject) {
        console.log('Running xcodebuild -importLocalizations for ' + langCode);
        let xcodebuildSpawn = spawn('xcodebuild', [
            '-importLocalizations'
            , '-localizationPath', options.localizationPath + '/' + langCode + '.xcloc'
            , '-project', options.xcodeProjPath
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
module.exports.importXliffFromXcode = async function (options) {
    console.log('Importing localization into ' + options.xcodeProjPath);
    console.log('Importing from folder: ' + options.localizationPath);

    let promises = [];

    let languagesKeys = Object.keys(constants.iosLanguageToCode);
    for (let languagesKeyIndex in languagesKeys) {
        let languageCodes = constants.iosLanguageToCode[languagesKeys[languagesKeyIndex]];
        for (let langCodeIndex in languageCodes) {
            let langCode = languageCodes[langCodeIndex];
            if (langCode === "en"){
                continue;
            }
            try {
                await runXcodeBuildImport(langCode, options);
                console.log("Finished " + langCode);
            } catch (error) {
                console.log("Finished with error "+langCode);
            }
            
        }
    }

    Promise.all(promises).then(function () {
        console.log('Finished');
    }).catch(function (error) {
        console.log('Finished with error ' + error);
    })
}