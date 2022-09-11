const fs = require('fs');
const junk = require('junk');
const { program } = require('commander');

const io = require('./src/io');
const constants = require('./src/constants');

program.option('-i, --inputFolder <path>').option('-o, --outputFolder <path>');
program.parse();

const options = program.opts();

function normalizePath(path) {
  // TODO: Find a cross-platform solution.
  return path.endsWith('/') ? path : `${path}/`;
}

const inputFolder = normalizePath(options.inputFolder);
const outputFolder = options.outputFolder ? normalizePath(options.outputFolder) : inputFolder;

const preferences = {
  createDateSubfolders: true,
  renameFiles: true
};

function renameAndCopyFilesList(list, inputPath, outputPath) {
  if (list.length <= 0) {
    console.error('No files found');

    return;
  }

  list.forEach((file) => {
    io.renameAndCopyFile(
      file,
      inputPath,
      outputPath,
      preferences.createDateSubfolders,
      preferences.renameFiles,
      (result) => {
        console.log(result);
      }
    );
  });
}

function renameAndCopyPhotos(inputPath, outputPath) {
  const currentTime = new Date();
  const outputFolderCreationDateAndTime =
    currentTime.toISOString().slice(0, 10) +
    constants.FILENAME_DELIMITER +
    currentTime.getHours().toString().padStart(2, '0') +
    constants.DATE_DELIMITER +
    currentTime.getMinutes().toString().padStart(2, '0') +
    constants.DATE_DELIMITER +
    currentTime.getSeconds().toString().padStart(2, '0');

  const outputPathCorrected =
    outputPath && outputPath !== inputPath
      ? `${outputPath}`
      : `${inputPath}Sorted Photos${constants.FILENAME_DELIMITER}${outputFolderCreationDateAndTime}/`;

  const dirList = fs.readdirSync(inputFolder);
  const filesList = dirList.filter((name) => {
    // Filter out system junk files like .DS_Store and Thumbs.db.
    if (junk.is(name)) {
      return false;
    }

    const path = inputFolder + name;
    const stat = fs.statSync(path);

    return stat.isFile();
  });

  io.makeDirSync(outputPathCorrected);

  console.log({ inputPath });
  console.log({ outputPathCorrected });
  console.log('');

  renameAndCopyFilesList(filesList, inputFolder, outputPathCorrected);
}

renameAndCopyPhotos(inputFolder, outputFolder);
