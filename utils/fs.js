import fs from "node:fs";

function readFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data;
  } catch (err) {
    console.error(err);
  }
}

function createDir(dirName) {
  try {
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName);
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.error(err);
  }
}

function deleteDiretory(pathToDir) {
  try {
    fs.rmSync(pathToDir, { recursive: true, force: true });
    console.log("Directory deleted successfully");
  } catch (error) {
    console.error("Error while deleting directory: ", err);
  }
}

function copyFile(srcPath, distPath) {
  try {
    fs.copyFileSync(srcPath, distPath);
    console.info("File copied successfully!");
  } catch (error) {
    console.error("Error copying file:", error);
  }
}

function checkIsDir(path) {
  const stats = fs.statSync(path);
  return stats.isDirectory();
}

function makeDir(path) {
  fs.mkdirSync(path, { recursive: true });
}

function isFileExists(path) {
  return fs.existsSync(path);
}

function readDir(path) {
  return fs.readdirSync(path);
}

export {
  readFile,
  createDir,
  deleteDiretory,
  copyFile,
  checkIsDir,
  makeDir,
  isFileExists,
  readDir,
};
