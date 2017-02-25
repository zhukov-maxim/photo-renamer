// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const fs = require('fs');
const exifParser = require('exif-parser');
const junk = require('junk');
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
};

const renameAndCopyFile = (
    fileName,
    inputFolder,
    outputFolder,
    createDateSubfolders,
    renameFiles) => {
  const filePath = inputFolder + fileName;

  const buffer = fs.readFileSync(filePath);

  const rawGPSDateStamp = getCreationDateFromBuffer(buffer) || '';
  const formattedDate = rawGPSDateStamp.replace(/:/g, DATE_DELIMITER);

  const formattedFileName = (renameFiles && formattedDate) ?
    formattedDate + FILENAME_DELIMITER + fileName :
    fileName;

  let outputFilePath;

  if (createDateSubfolders) {
    const dateSubfolder = formattedDate ?
      `${outputFolder}${formattedDate}${FILENAME_DELIMITER}${NEW_FOLDER_NAME}/` :
      `${outputFolder}Files without dates/`;

    makeDir(dateSubfolder);
    outputFilePath = dateSubfolder + formattedFileName;
  } else {
    outputFilePath = outputFolder + formattedFileName;
  }

  fs.writeFileSync(outputFilePath, buffer);

  // TODO: Return error message if something went wrong:
  return `${fileName} → ${formattedFileName}`;
};

const defaultAppState = {
  inputFolder: '',
  outputFolder: '',
  log: [],
  isProcessing: false
};

const defaultPreferences = {
  createDateSubfolders: true,
  renameFiles: true
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
    handleRenameFiles() {
      savePreferences({
        renameFiles: this.preferences.renameFiles
      });
    },
    renameAndCopyFilesList(list, inputFolder, outputFolder) {
      this.isProcessing = true;

      if (list.length <= 0) {
        this.log.push('Done.');
        this.isProcessing = false;
        return;
      }

      const fileName = list.shift();

      const result = renameAndCopyFile(
        fileName,
        inputFolder,
        outputFolder,
        this.preferences.createDateSubfolders,
        this.preferences.renameFiles
      );

      this.log.push(result);

      setTimeout(() => {
        this.renameAndCopyFilesList(list, inputFolder, outputFolder);
      }, 0);
    },
    renamePhotos() {
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

      makeDir(outputFolder);

      this.renameAndCopyFilesList(filesList, inputFolder, outputFolder);
    }
  }
});
/* eslint-enable no-unused-vars */
