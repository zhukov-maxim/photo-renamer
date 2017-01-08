console.log('Start...');

const INPUT_FOLDER = './input/';
const OUTPUT_FOLDER = './output/';
const DATE_DELIMITER = '-';
const FILENAME_DELIMITER = ' - ';
const NEW_FOLDER_NAME = 'Untitled';

const makeDir = name => {
  const fs = require('fs');

  if (!fs.existsSync(name)) {
    fs.mkdirSync(name);
  }
}

const getCreationDateFromBuffer = buffer => {
  const exifParser = require('exif-parser').create(buffer);
  const exifData = exifParser.parse();

  return exifData.tags.GPSDateStamp;
}

const renameAndCopyFile = (fileName, inputFolder, outputFolder) => {
  const filePath = inputFolder + fileName;

  const fs = require('fs');
  const buffer = fs.readFileSync(filePath);

  const rawGPSDateStamp = getCreationDateFromBuffer(buffer) || '';
  const formattedDate = rawGPSDateStamp.replace(/:/g, DATE_DELIMITER);

  const dateSubfolder = outputFolder + formattedDate + FILENAME_DELIMITER + NEW_FOLDER_NAME + '/';
  makeDir(dateSubfolder);

  const formattedFileName = formattedDate + FILENAME_DELIMITER + fileName;
  const outputFilePath = dateSubfolder + formattedFileName;

  fs.writeFileSync(outputFilePath, buffer);
}

const fs = require('fs');
const filesList = fs.readdirSync(INPUT_FOLDER);

// TODO: Filter files list by file extension.

// TODO: Create an output folder with unique name.
makeDir(OUTPUT_FOLDER);

filesList.forEach(fileName => {
  renameAndCopyFile(fileName, INPUT_FOLDER, OUTPUT_FOLDER);
});

console.log('End.');
