const fs = require('fs');
const exifParser = require('exif-parser');
const constants = require('./constants');

module.exports = {
  makeDir(name) {
    if (!fs.existsSync(name)) {
      fs.mkdirSync(name);
    }
  },

  getCreationDateFromBuffer(buffer) {
    try {
      const exifParserBuffer = exifParser.create(buffer);

      const exifData = exifParserBuffer.parse();
      const modifyDateAndTime = exifData.tags.ModifyDate;

      if (!modifyDateAndTime) {
        return undefined;
      }
      const modifyDate = modifyDateAndTime.slice(0, modifyDateAndTime.indexOf(' '));

      return modifyDate;
    } catch (e) {
      return undefined;
    }
  },

  renameAndCopyFile(
    fileName,
    inputFolder,
    outputFolder,
    createDateSubfolders,
    renameFiles) {
    const filePath = inputFolder + fileName;

    const buffer = fs.readFileSync(filePath);

    const rawGPSDateStamp = this.getCreationDateFromBuffer(buffer) || '';
    const formattedDate = rawGPSDateStamp.replace(/:/g, constants.DATE_DELIMITER);

    const formattedFileName = (renameFiles && formattedDate) ?
      formattedDate + constants.FILENAME_DELIMITER + fileName :
      fileName;

    let outputFilePath;

    if (createDateSubfolders) {
      const dateSubfolder = formattedDate ?
        `${outputFolder}${formattedDate}${constants.FILENAME_DELIMITER}${constants.NEW_FOLDER_NAME}/` :
        `${outputFolder}Files without dates/`;

      this.makeDir(dateSubfolder);
      outputFilePath = dateSubfolder + formattedFileName;
    } else {
      outputFilePath = outputFolder + formattedFileName;
    }

    fs.writeFileSync(outputFilePath, buffer);

    // TODO: Return error message if something went wrong:
    return `${fileName} → ${formattedFileName}`;
  }
};
