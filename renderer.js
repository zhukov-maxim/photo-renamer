// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const fs = require('fs');
const exifParser = require('exif-parser');
const Vue = require('./node_modules/vue/dist/vue.js');
const ElectronConfig = require('electron-config');

const electronConfig = new ElectronConfig();

const DATE_DELIMITER = '-';
const FILENAME_DELIMITER = ' - ';
const NEW_FOLDER_NAME = 'Untitled';

const makeDir = (name) => {
  if (!fs.existsSync(name)) {
    fs.mkdirSync(name);
  }
};

const getCreationDateFromBuffer = (buffer) => {
  const exifParserBuffer = exifParser.create(buffer);
  const exifData = exifParserBuffer.parse();
  return exifData.tags.GPSDateStamp;
};

const renameAndCopyFile = (fileName, inputFolder, outputFolder, createDateSubfolders) => {
  const filePath = inputFolder + fileName;

  const buffer = fs.readFileSync(filePath);

  const rawGPSDateStamp = getCreationDateFromBuffer(buffer) || '';
  const formattedDate = rawGPSDateStamp.replace(/:/g, DATE_DELIMITER);

  const formattedFileName = formattedDate ?
    formattedDate + FILENAME_DELIMITER + fileName :
    fileName;

  let outputFilePath;

  if (createDateSubfolders) {
    const dateSubfolder = formattedDate ?
      `${outputFolder}${formattedDate}${FILENAME_DELIMITER}${NEW_FOLDER_NAME}/` :
      `${outputFolder}Photos without dates/`;

    makeDir(dateSubfolder);
    outputFilePath = dateSubfolder + formattedFileName;
  } else {
    outputFilePath = outputFolder + formattedFileName;
  }

  fs.writeFileSync(outputFilePath, buffer);

  // TODO: Return error message if something went wrong:
  return `${fileName} → ${formattedFileName}`;
};

const isJpeg = (fileName) => {
  const lowerCaseName = fileName.toLowerCase();
  const hasJpegExtension = lowerCaseName.endsWith('.jpg') || lowerCaseName.endsWith('.jpeg');

  return hasJpegExtension;
};

const defaultAppState = {
  inputFolder: '',
  outputFolder: '',
  log: []
};

const defaultPreferences = {
  createDateSubfolders: true
};

const loadPreferences = () => electronConfig.get();

const savePreferences = (changedPreferences) => {
  const newPreferences = Object.assign(
    {},
    loadPreferences(),
    changedPreferences
  );

  electronConfig.set(newPreferences);
};

const currentPreferences = Object.assign(
  {},
  defaultPreferences,
  loadPreferences()
);

const currentAppState = Object.assign(
  {},
  defaultAppState,
  {
    preferences: currentPreferences
  }
);

/* eslint-disable no-unused-vars */
const app = new Vue({
  el: '#root',
  data: currentAppState,
  computed: {
    foldersSelected() {
      return !(this.inputFolder);
    }
  },
  methods: {
    chooseInputFolder() {
      this.$refs.inputFolder.click();
    },
    chooseOutputFolder() {
      this.$refs.outputFolder.click();
    },
    getInputFolder() {
      const inputFolder = document.getElementById('inputFolder').files[0].path;
      this.inputFolder = inputFolder;
    },
    getOutputFolder() {
      const outputFolder = document.getElementById('outputFolder').files[0].path;
      this.outputFolder = outputFolder;
    },
    handleCreateDateSubfolders() {
      savePreferences({
        createDateSubfolders: this.preferences.createDateSubfolders
      });
    },
    renameAndCopyFilesList(list, inputFolder, outputFolder) {
      if (list.length <= 0) {
        this.log.push('Done.');
        return;
      }

      const fileName = list.shift();

      const result = renameAndCopyFile(
        fileName,
        inputFolder,
        outputFolder,
        this.preferences.createDateSubfolders
      );

      this.log.push(result);

      setTimeout(() => {
        this.renameAndCopyFilesList(list, inputFolder, outputFolder);
      }, 0);
    },
    renamePhotos() {
      console.log('rename start');

      // TODO: Find cross-platform solution:
      const inputFolder = `${this.inputFolder}/`;

      const currentTime = new Date();
      const outputFolderCreationDateAndTime =
        currentTime.toISOString().slice(0, 10) +
        FILENAME_DELIMITER +
        currentTime.getHours() +
        DATE_DELIMITER +
        currentTime.getMinutes() +
        DATE_DELIMITER +
        currentTime.getSeconds();

      const outputFolder = (this.outputFolder && this.outputFolder !== this.inputFolder) ?
        `${this.outputFolder}/` :
        `${this.inputFolder}/Sorted Photos${FILENAME_DELIMITER}${outputFolderCreationDateAndTime}/`;

      const filesList = fs.readdirSync(inputFolder);
      const jpegOnlyFilesList = filesList.filter(isJpeg);

      // TODO: Create an output folder with unique name.
      makeDir(outputFolder);

      console.log(inputFolder);
      console.log(outputFolder);

      this.renameAndCopyFilesList(jpegOnlyFilesList, inputFolder, outputFolder);

      console.log('rename end');
    }
  }
});
/* eslint-enable no-unused-vars */
