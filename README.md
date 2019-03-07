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
- The input file is an Excel. See example folder for the example.xlsx input file.
- First line have the names of the languages, which are mapped to one or more language codes (it is very important that the names of the languages match the ones in the source).
- First column is for the string ids.
- Second column is for the text in english.
- Remaining columns are for the strings in other languages according to the language in the first line.
- You can add more lines with your own strings or more columns if you need more languages, as long as you add the corresponding language name to language codes in the source.

- [x] Read strings and translations from Excel file.
- [ ] Read from CSV file.
- [x] Replace or create new strings in the Android strings.xml files.
- [x] List the changes.
- [x] Configurable column index for string ids.
- [x] Configurable column index for text in english.

## Excel to iOS
- [ ] Need description.

## Check Android XML files
- [x] List missing translations: string id exists for english but not for one or more of the other languages.
- [x] List issues on formattable strings: string in english has formatting placeholders (%s, %1$s, etc) but not for one or more of the other languages.
- [x] Ignore list of files.
- [x] Report to a file.
- [ ] Ability to remove a string id completely or only the translations.