const fs = require('fs');
const junk = require('junk');
const constants = require('./constants');
const io = require('./io');
const Vue = require('./node_modules/vue/dist/vue.js');
const ElectronConfig = require('electron-config');

const electronConfig = new ElectronConfig();

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
  watch: {
    log() {
      const lg = document.getElementById('log');
      lg.scrollTop = lg.scrollHeight;
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

      const result = io.renameAndCopyFile(
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
        constants.FILENAME_DELIMITER +
        currentTime.getHours() +
        constants.DATE_DELIMITER +
        currentTime.getMinutes() +
        constants.DATE_DELIMITER +
        currentTime.getSeconds();

      const outputFolder = (this.outputFolder && this.outputFolder !== this.inputFolder) ?
        `${this.outputFolder}/` :
        `${this.inputFolder}/Sorted Photos${constants.FILENAME_DELIMITER}${outputFolderCreationDateAndTime}/`;

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

      io.makeDir(outputFolder);

      this.renameAndCopyFilesList(filesList, inputFolder, outputFolder);
    }
  }
});
/* eslint-enable no-unused-vars */
