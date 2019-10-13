const exifParser = require('exif-parser');
const exiftool = require('exiftool-vendored').exiftool;
const fs = require('fs');
const path = require('path');

const constants = require('./constants');

module.exports = {
  makeDir(name) {
    if (!fs.existsSync(name)) {
      fs.mkdirSync(name);
    }
  },

  getFileDateGeneric(filePath, callback) {
    try {
      const buffer = fs.readFileSync(filePath);
      const exifParserBuffer = exifParser.create(buffer);
      const exifData = exifParserBuffer.parse();

      const modifyDateAndTime = this.getRawModifyDateAndTimeGeneric(exifData);
      const modifyDate = this.getDateFromDateAndTime(modifyDateAndTime);
      const formattedDate = this.formatDate(modifyDate);

      callback(formattedDate);
    } catch (err) {
      callback(undefined);
    }

    return undefined;
  },

  getFileDateHeic(filePath, callback) {
    exiftool
      .read(filePath)
      .then((tags) => {
        const modifyDateAndTime = this.getRawModifyDateAndTimeHeic(tags);
        const modifyDate = this.getDateFromDateAndTime(modifyDateAndTime);
        const formattedDate = this.formatDate(modifyDate);

        callback(formattedDate);
      })
      .catch(err => console.error('Something terrible happened: ', err));
  },

  getRawModifyDateAndTimeGeneric(exifData) {
    if (exifData && exifData.tags) {
      return exifData.tags.ModifyDate;
    }

    return undefined;
  },

  getRawModifyDateAndTimeHeic(exifTags) {
    if (exifTags && exifTags.ModifyDate) {
      return exifTags.ModifyDate.rawValue;
    }

    return undefined;
  },

  getDateFromDateAndTime(dateAndTime) {
    return dateAndTime.slice(0, dateAndTime.indexOf(' '));
  },

  formatDate(rawDate) {
    return rawDate.replace(/:/g, constants.DATE_DELIMITER);
  },

  renameAndCopyFile(
    fileName,
    inputFolder,
    outputFolder,
    createDateSubfolders,
    renameFiles,
    cb
  ) {
    const filePath = inputFolder + fileName;
    const fileExtension = path.extname(filePath);

    function copy(formattedDate) {
      const formattedFileName = (renameFiles && formattedDate) ?
        formattedDate + constants.FILENAME_DELIMITER + fileName :
        fileName;

      let outputFilePath;

      if (createDateSubfolders) {
        const dateSubfolder = formattedDate ?
          `${outputFolder}${formattedDate}${constants.FILENAME_DELIMITER}${constants.NEW_FOLDER_NAME}/` :
          `${outputFolder}Files without dates/`;

        if (!fs.existsSync(dateSubfolder)) {
          fs.mkdirSync(dateSubfolder);
        }

        outputFilePath = dateSubfolder + formattedFileName;
      } else {
        outputFilePath = outputFolder + formattedFileName;
      }

      // Node 7 doesn't support fs.copyFileSync.
      fs.createReadStream(filePath).pipe(fs.createWriteStream(outputFilePath));

      cb(`${fileName} → ${formattedFileName}`);
    }

    if (fileExtension.toLowerCase() === '.heic') {
      this.getFileDateHeic(filePath, formattedDate => copy(formattedDate));
    } else {
      this.getFileDateGeneric(filePath, formattedDate => copy(formattedDate));
    }
  }
};
