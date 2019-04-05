# Localizationeer.js
The localizationeer was originally intended to be a tool to import localization strings from one Excel file to Android XML string files. It grew in functionality as needed. This is the second version of this project, which was first created in C# to be used in Windows only. When ~~Windows haters~~ non-Windows users manifested interest in using the tool, came the need to make it cross platform. We chose Node.js to accomplish that.

Current functionalities:
- Import localization strings from one Excel file to Android XML string files
- Import localization strings from one Excel file to iOS XLIFF files
- Check for inconsistencies on Android XML string files, looking for missing translations and issues on formattable strings

## Installation
Install Node.js and you should be good to go.

After downloading the repository, don't forget to run the following command:
> npm install

After that just run:
> node app.js

## Dependencies
- ExcelJS https://www.npmjs.com/package/exceljs
- FS https://www.npmjs.com/package/fs
- XLIFF https://www.npmjs.com/package/xliff

## Excel to Android
- The input file is an Excel or CSV. See example folder for the example.xlsx and example.csv input files.
- First line have the names of the languages, which are mapped to one or more language codes (it is very important that the names of the languages match the ones in the source).
- First column is for the string ids.
- Second column is for the text in English.
- Remaining columns are for the strings in other languages according to the language in the first line.
- You can add more lines with your own strings or more columns if you need more languages, as long as you add the corresponding language name to language codes in the source.

- [x] Read strings and translations from Excel file.
- [x] Read from CSV file using ';' as separator.
- [x] Replace or create new strings in the Android strings.xml files.
- [x] List the changes.
- [x] Configurable column index for string ids.
- [x] Configurable column index for text in English.

Example 1: Import strings from a xml file.
> node app.js -operation=excel2android -excelFileName=/your/excel/file.xslx -xmlsFolderName=/your/app/src/main/res

Example 2: Import strings from a csv file.
> node app.js -operation=excel2android -excelFileName=/your/csv/file.csv -xmlsFolderName=/your/app/src/main/res

To inform the column index for the string id use
> -idColumnIndex=1

To inform the column index for the text in English use
> -idEnglishColumnIndex=2

To inform the number of white spaces used for xml indentation use
> -indentationSpaces=4

## Excel to iOS
- The input file is an Excel or CSV. See example folder for the example.xlsx and example.csv input files.
- First line have the names of the languages, which are mapped to one or more language codes (it is very important that the names of the languages match the ones in the source).
- First column is for the string ids (Optional for iOS).
- Second column is for the text in English (This column will be used as <source> to be matched in xliff files).
- Remaining columns are for the strings in other languages according to the language in the first line.
- You can add more lines with your own strings (as long as they are present in xliff files) or more columns if you need more languages (as long as you add the corresponding language name to language codes in the source and the xliff file exists).
- It is still needed to export the xliff files from Xcode to have it running correctly.
- The process would be: 
  1. Get the Excel file with the translations;
  2. Export the xliff files from Xcode with the languages supported;
  3. Run the tool (it will update the xliff files with the translations);
  4. Import the xliff back to the app with Xcode.

- [x] Read strings and translations from Excel file.
- [x] Read from CSV file using ';' as separator.
- [x] Replace strings in xliff files exported from Xcode.
- [x] List the changes.
- [x] Configurable column index for string in English to be used as index (use the same as string id).

## Check Android XML files
- [x] List missing translations: string id exists for English but not for one or more of the other languages.
- [x] List issues on formattable strings: string in English has formatting placeholders (%s, %1$s, etc) but not for one or more of the other languages.
- [x] Filter listings: without default (no English), without translations (only English), format issues.
- [x] Ignore list of files.
- [x] Report to a file.
- [x] Ability to remove a string id completely or only the translations.
- [x] Ability to clone a string id.
- [x] Ability to join 2 or more string ids into one.

Example 1: List all issues (missing translations, formatting issues).
> node app.js -operation=androidCheck -xmlsFolderName=/your/app/src/main/res

To ignore some xml files (usually files from packages you don't want to localize) use
> -ignoreFiles=package1.xml,package2.xml,attrs.xml,dimens.xml

To export to a file use
> -output=output.txt

To list only missing translations use
> -formatIssues=false

To list only formatting issues use
> -missingStrings=false

To list only string ids without default (English) text use
> -noDefaultOnly=true

To list only string id without translations use
> -notTranslatedOnly=true

Example 2: Delete a string id from all xmls.
> node app.js -operation=androidTools -xmlsFolderName=/your/app/src/main/res -paramAction=delete -paramId=stringid

To keep the default string (English) use
> -paramKeepDefault=true

Example 3: Duplicate a string id in all possible xmls.
> node app.js -operation=androidTools -xmlsFolderName=/your/app/src/main/res -paramAction=clone -paramSource=sourceid -paramTarget=targetid

To overwrite existing target strings use
> -paramForce=true

Example 4: Join 2 string ids into one.
> node app.js -operation=androidTools -xmlsFolderName=/your/app/src/main/res -paramAction=join -paramSource=id1,id2 -paramTarget=id1 -paramSeparator=\\n