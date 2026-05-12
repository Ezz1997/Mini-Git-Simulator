#!/usr/bin/env node
import fs from "node:fs";
import crypto from "crypto";

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
  snapshot: {},
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
      data.repos[data.HEAD.repo].branches[branchName] = { commits: [] };
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
        [defaultBranch]: { commits: [] },
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
    let numOfChanges = 0;

    let files = fs.readdirSync(`${data.HEAD.repo}/${data.HEAD.branch}`);
    let commits = data.repos[data.HEAD.repo].branches[data.HEAD.branch].commits;

    for (let file of files) {
      let fileHash = hashFileContent(
        `${data.HEAD.repo}/${data.HEAD.branch}/${file}`,
      );

      let isDiff = checkDiff(file, fileHash);
      if (isDiff) {
        numOfChanges++;
      }
    }

    if (numOfChanges) {
      let commit = new Commit(commitMessage);
      commit.snapshot = structuredClone(data.snapshot);
      commits.push(commit);

      saveJsonFile();
    }
  } else {
    console.error("Current Repo Missing!");
  }
}

function checkDiff(file, fileHash) {
  if (!data.snapshot[file] || data.snapshot[file] !== fileHash) {
    data.snapshot[file] = fileHash;
    return true;
  } else {
    console.info("No changes found.");
    return false;
  }
}

function copyFile(srcPath, distPath) {
  fs.copyFileSync(srcPath, distPath, (err) => {
    if (err) {
      console.error("Error copying file:", err);
    } else {
      console.info("File copied successfully!");
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

function hashFileContent(src) {
  let data = readFile(src);

  // Create a hash object
  const hash = crypto.createHash("sha1");

  // Update the hash with data
  hash.update(data);

  return hash.digest("hex");
}

function handleActions() {
  const args = process.argv.slice(2, 4);
  const action = args[0];
  const value = args[1];

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
    case "push":
      pushChanges();
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
    default:
      console.error("Unknown action, Try again");
  }
}

initMetaData();
handleActions();
