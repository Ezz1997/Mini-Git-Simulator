#!/usr/bin/env node
import fs from "node:fs";
import crypto from "crypto";

const defaultBranch = "main";
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

function createBranch(branchName, repoName) {
  let res = createDir(`${repoName || data.HEAD.repo}/${branchName}`);

  if (res) {
    if (!repoName && data.HEAD.repo) {
      data.repos[data.HEAD.repo].branches[branchName] = {
        stagedFiles: {},
        snapshot: {},
        commits: [],
      };
      saveJsonFile();
    }

    console.info(`Branch ${branchName} created Successfully!`);
    return res;
  }

  if (res === false) {
    console.error("Another branch with same name already exists.");
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
    console.info(`Repository ${repoName} created Successfully!`);
    data.repos[repoName] = {
      branches: {
        [defaultBranch]: { stagedFiles: {}, snapshot: {}, commits: [] },
      },
    };

    data.HEAD.repo = repoName;
    data.HEAD.branch = defaultBranch;

    saveJsonFile();
  }

  if (repoRes === false) {
    console.error("Another repository with same name already exists.");
  }

  if (repoRes === undefined) {
    console.error("Failed to create new repository");
  }
}

function saveJsonFile() {
  try {
    fs.writeFileSync(METADATA_FILE_NAME, JSON.stringify(data, null, 2));
    console.info("Data Appended Successfully!");
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
      console.error("File was not found");
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
    let curBranch = data.repos[data.HEAD.repo].branches[data.HEAD.branch];
    let commits = curBranch.commits;

    if (
      curBranch.stagedFiles &&
      Object.keys(curBranch.stagedFiles).length > 0
    ) {
      curBranch.snapshot = { ...curBranch.snapshot, ...curBranch.stagedFiles };
      let commit = new Commit(commitMessage);
      commit.snapshot = structuredClone(curBranch.snapshot);
      commits.push(commit);
      curBranch.stagedFiles = {};

      saveJsonFile();
    } else {
      console.info("No changes found.");
    }
  } else {
    console.error("Current Repo Missing!");
  }
}

function checkDiff(file, fileHash) {
  let curBranch = data.repos[data.HEAD.repo].branches[data.HEAD.branch];

  if (!curBranch.snapshot[file] || curBranch.snapshot[file] !== fileHash) {
    return true;
  } else {
    return false;
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

function readFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data;
  } catch (err) {
    console.error(err);
  }
}

function hashFileContent(src) {
  let data = readFile(src);

  // Create a hash object
  const hash = crypto.createHash("sha1");

  // Update the hash with data
  hash.update(data);

  return hash.digest("hex");
}

function logCommitHistory() {
  let commits = data.repos[data.HEAD.repo].branches[data.HEAD.branch].commits;

  if (commits.length < 1) {
    return;
  }

  // print commits from newest to oldest
  for (let i = commits.length - 1; i >= 0; i--) {
    let commit = commits[i];
    console.log({ id: commit.id, message: commit.message, date: commit.date });
  }
}

function logStatus() {
  if (data.HEAD.repo) {
    let numOfChanges = 0;

    let files = fs.readdirSync(`${data.HEAD.repo}/${data.HEAD.branch}`);
    let curBranch = data.repos[data.HEAD.repo].branches[data.HEAD.branch];
    let commits = curBranch.commits;

    for (let file of files) {
      let fileHash = hashFileContent(
        `${data.HEAD.repo}/${data.HEAD.branch}/${file}`,
      );

      let isDiff = checkDiff(file, fileHash);
      if (isDiff) {
        console.info(`Modified: ${data.HEAD.repo}/${data.HEAD.branch}/${file}`);
        numOfChanges++;
      }
    }

    if (numOfChanges === 0) {
      console.info("Status: No changes detected.");
    }
  } else {
    console.error("Current Repo Missing!");
  }
}

function stageFiles(files) {
  let stagedFiles = files;

  if (!stagedFiles.length) {
    return;
  }

  if (data.HEAD.repo) {
    if (stagedFiles[0] === ".") {
      stagedFiles = fs.readdirSync(`${data.HEAD.repo}/${data.HEAD.branch}`);
      console.info("Add All changed files");
    }

    let numOfChanges = 0;

    let curBranch = data.repos[data.HEAD.repo].branches[data.HEAD.branch];

    for (let file of stagedFiles) {
      let fileHash = hashFileContent(
        `${data.HEAD.repo}/${data.HEAD.branch}/${file}`,
      );

      if (curBranch.stagedFiles[file] !== fileHash) {
        let isDiff = checkDiff(file, fileHash);
        if (isDiff) {
          curBranch.stagedFiles[file] = fileHash;
          numOfChanges++;
        }
      }
    }

    if (numOfChanges) {
      saveJsonFile();
    } else {
      console.info("No changes found.");
    }
  } else {
    console.error("Current Repo Missing!");
  }
}

function handleActions() {
  const args = process.argv.slice(2, 4);
  const action = args[0];
  const value = args[1];
  let files = process.argv.slice(3);

  console.info(`Action: ${action}, Value: ${value}`);

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
    case "log":
      logCommitHistory();
      break;
    case "checkout":
      checkout(value);
      break;
    case "cur-repo":
      let curRepo = getCurrentRepo();
      console.info(curRepo);
      break;
    case "cur-branch":
      let curBranch = getCurrentBranch();
      console.log(curBranch);
      break;
    case "status":
      logStatus();
      break;
    case "add":
      stageFiles(files);
      break;
    default:
      console.error("Unknown action, Try again");
  }
}

initMetaData();
handleActions();
