#!/usr/bin/env node
import fs from "node:fs";

let localRepo = "x";
let remoteRepo = "sys";
const defaultBranch = "main";
let curBranch = defaultBranch;
let data = {
  repos: {},
  HEAD: {
    repo: "",
    branch: "",
  },
};

const METADATA_FILE_NAME = "data.json";

function Commit(message) {
  this.id = crypto.randomUUID();
  this.message = message;
  this.date = new Date();
  this.repo = data.HEAD.repo;
  this.branch = data.HEAD.branch;
  this.files = [];
}

Commit.prototype.toJSON = function () {
  return {
    id: this.id,
    message: this.message,
    date: this.date,
    repo: this.repo,
    branch: this.branch,
  };
};

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

function createBranch(branchName, repoName) {
  let res = createDir(`${repoName || data.HEAD.repo}/${branchName}`);

  if (res) {
    if (!repoName && data.HEAD.repo) {
      data.repos[data.HEAD.repo].branches[branchName] = { commits: [] };
      saveJsonFile();
    }

    console.log(`Branch ${branchName} created Successfully!`);
    return res;
  }

  if (res === false) {
    console.log("Another branch with same name already exists.");
  }

  if (res === undefined) {
    console.error("Failed to create new branch");
  }
}

function checkout(branchName) {
  if (branchName && data.repos[data.HEAD.repo].branches[branchName]) {
    data.HEAD.branch = branchName;
    saveJsonFile();
  } else {
    console.error("Branch doesn't exist.");
  }
}

function createRepo(repoName) {
  let repoRes = createDir(repoName);
  let branchRes = createBranch(defaultBranch, repoName);

  if (repoRes && branchRes) {
    console.log(`Repository ${repoName} created Successfully!`);
    data.repos[repoName] = {
      branches: {
        [defaultBranch]: { commits: [] },
      },
    };

    data.HEAD.repo = repoName;
    data.HEAD.branch = defaultBranch;

    saveJsonFile();
  }

  if (repoRes === false) {
    console.log("Another repository with same name already exists.");
  }

  if (repoRes === undefined) {
    console.error("Failed to create new repository");
  }
}

function saveJsonFile() {
  try {
    fs.writeFileSync(METADATA_FILE_NAME, JSON.stringify(data, null, 2));
    console.log("Data Appended Successfully!");
  } catch (error) {
    console.error("Error updating file: " + error);
  }
}

function initMetaData() {
  try {
    if (fs.existsSync(METADATA_FILE_NAME)) {
      const readData = fs.readFileSync(METADATA_FILE_NAME);
      let json = JSON.parse(readData);

      data = json;
    } else {
      console.log("File was not found");
    }
  } catch (error) {
    console.error("Error reading file: " + error);
  }
}

function getCurrentRepo() {
  return data.HEAD.repo;
}

function getCurrentBranch() {
  return data.HEAD.branch;
}

function commit(commitMessage) {
  if (!commitMessage) {
    console.error("Cannot commit without a message, Try Again.");
    return;
  }

  if (data.HEAD.repo) {
    let commit = new Commit(commitMessage);
    let filesData = [];

    let files = fs.readdirSync(`${data.HEAD.repo}/${data.HEAD.branch}`);

    for (let file of files) {
      let fileData = readFile(`${data.HEAD.repo}/${data.HEAD.branch}/${file}`);
      let commits =
        data.repos[data.HEAD.repo].branches[data.HEAD.branch].commits;

      let isDiff = checkDiff(file);

      if (isDiff) {
        filesData.push({
          fileName: file,
          data: fileData,
        });
      }
    }

    if (filesData.length) {
      console.log(filesData);
      data.repos[data.HEAD.repo].branches[data.HEAD.branch].commits.push({
        ...commit,
        files: filesData,
      });
      saveJsonFile();
    }
  } else {
    console.error("Current Repo Missing!");
  }
}

function checkDiff(fileName) {
  const currentVersion = readFile(
    `${data.HEAD.repo}/${data.HEAD.branch}/${fileName}`,
  );

  let commits = data.repos[data.HEAD.repo].branches[data.HEAD.branch].commits;
  let lastSavedVersion;

  for (let j = commits.length - 1; j >= 0; j--) {
    const curCommit = commits[j];
    lastSavedVersion = curCommit.files?.findLast(
      (file) => file.fileName === fileName,
    );
    if (lastSavedVersion) {
      break;
    }
  }

  if (!lastSavedVersion || !lastSavedVersion.data) {
    return true;
  }

  console.log(lastSavedVersion);

  if (lastSavedVersion.data !== currentVersion) {
    return true;
  } else {
    console.info("No changes found.");
    return false;
  }
}

function copyFile(srcPath, distPath) {
  fs.copyFile(srcPath, distPath, (err) => {
    if (err) {
      console.error("Error copying file:", err);
    } else {
      console.log("File copied successfully!");
    }
  });
}

function readFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data;
  } catch (err) {
    console.error(err);
  }
}

function pushChanges() {
  let remoteRes = fs.readdirSync(`${remoteRepo}/main`);
  let localRes = fs.readdirSync(`${localRepo}/main`);
  let fileName = localRes[localRes.length - 1];

  const localVersion = readFile(
    `${data.HEAD.repo}/main/${localRes[localRes.length - 1]}`,
  );
  const remoteVersion = readFile(
    `${remoteRepo}/main/${remoteRes[remoteRes.length - 1]}`,
  );

  if (remoteVersion !== localVersion) {
    copyFile(`${localRepo}/main/${fileName}`, `${remoteRepo}/main/${fileName}`);
  } else {
    console.info("No changes found.");
  }
}

function handleActions() {
  const args = process.argv.slice(2, 4);
  const action = args[0];
  const value = args[1];

  console.log(`Action: ${action}, Value: ${value}`);

  switch (action) {
    case "create-repo":
      createRepo(value);
      break;
    case "create-branch":
      createBranch(value);
      break;
    case "commit":
      commit(value);
      break;
    case "push":
      pushChanges();
      break;
    case "checkout":
      checkout(value);
      break;
    case "cur-repo":
      let curRepo = getCurrentRepo();
      console.log(curRepo);
      break;
    case "cur-branch":
      let curBranch = getCurrentBranch();
      console.log(curBranch);
      break;
    default:
      console.log("Unknown action, Try again");
  }
}

initMetaData();
handleActions();
