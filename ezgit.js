#!/usr/bin/env node
import fs from "node:fs";
import { hashFileContent } from "./utils/hash.js";
import { createDir, deleteDiretory, copyFile } from "./utils/fs.js";
import { MetadataStore } from "./storage/MetadataStore.js";
import { RepositoryManager } from "./RepositoryManager.js";

const defaultBranch = "main";
let data = {
  repos: {},
  HEAD: {
    repo: "",
    branch: "",
  },
};

const metadataStore = new MetadataStore();
data = metadataStore.load() || data;

const repoManager = new RepositoryManager(data);
const BLOBS_PATH = ".ezgit/objects";

class Commit {
  constructor(message, parent = null) {
    this.id = crypto.randomUUID();
    this.message = message;
    this.date = new Date();
    this.repo = repoManager.curRepo;
    this.branch = repoManager.curBranch;
    this.parent = parent;
  }
}

function createBranch(branchName, repoName) {
  if (branchName) {
    data.repos[repoName || repoManager.curRepo].branches[branchName] = {
      stagedFiles: {},
      snapshot: {},
      commits: [],
    };
    metadataStore.save(data);
  } else {
    console.error("Failed to create new branch");
  }
}

function checkIsDir(file) {
  const stats = fs.statSync(`${repoManager.curRepo}/${file}`);
  return stats.isDirectory();
}

function checkout(branchName) {
  if (branchName === repoManager.curBranch) {
    return;
  }

  if (branchName && data.repos[repoManager.curRepo].branches[branchName]) {
    let files = fs.readdirSync(`${repoManager.curRepo}`);
    let snapshot = repoManager.snapshot();

    // Delete current branch files that don't exist or are outdated in the new branch
    for (let file of files) {
      const isDir = checkIsDir(file);

      if (!isDir && !snapshot[file]) {
        fs.unlinkSync(`${repoManager.curRepo}/${file}`);
        console.log("Snapshot: ", snapshot);
      }
    }

    repoManager.curBranch = branchName;

    // for each file put a new copy in the current directory
    for (let fileName of Object.keys(snapshot)) {
      if (snapshot[fileName].state !== "deleted") {
        copyFile(
          `${repoManager.curRepo}/${BLOBS_PATH}/${snapshot[fileName].hash}`,
          `${repoManager.curRepo}/${fileName}`,
        );
      }
    }

    metadataStore.save(data);
  } else {
    console.error("Branch doesn't exist.");
  }
}

function createRepo(repoName) {
  let repoRes = createDir(repoName);

  if (repoRes) {
    console.info(`Repository ${repoName} created Successfully!`);

    // Create the hidden object database
    fs.mkdirSync(`${repoName}/${BLOBS_PATH}`, { recursive: true });

    data.repos[repoName] = {
      branches: {
        [defaultBranch]: {
          stagedFiles: {},
          snapshot: {},
          commits: [],
        },
      },
    };

    data.HEAD.repo = repoName;
    data.HEAD.branch = defaultBranch;

    metadataStore.save(data);
  }

  if (repoRes === false) {
    console.error("Another repository with same name already exists.");
  }

  if (repoRes === undefined) {
    console.error("Failed to create new repository");
  }
}

function getCurrentRepo() {
  return repoManager.curRepo;
}

function getCurrentBranch() {
  return repoManager.curBranch;
}

function commit(commitMessage) {
  if (!commitMessage) {
    console.error("Cannot commit without a message, Try Again.");
    return;
  }

  if (repoManager.curRepo) {
    let curBranch =
      data.repos[repoManager.curRepo].branches[repoManager.curBranch];
    let commits = curBranch.commits;

    if (
      curBranch.stagedFiles &&
      Object.keys(curBranch.stagedFiles).length > 0
    ) {
      repoManager.snapshot = {
        ...repoManager.snapshot,
        ...curBranch.stagedFiles,
      };
      let parentCommit = commits[commits.length - 1] || null;
      let commit = new Commit(
        commitMessage,
        parentCommit ? parentCommit.id : null,
      );
      commit.snapshot = structuredClone(repoManager.snapshot);
      commits.push(commit);

      for (let file of Object.keys(curBranch.stagedFiles)) {
        if (
          commit.snapshot[file].state !== "deleted" &&
          !fs.existsSync(
            `${repoManager.curRepo}/${BLOBS_PATH}/${curBranch.stagedFiles[file].hash}`,
          )
        ) {
          copyFile(
            `${repoManager.curRepo}/${file}`,
            `${repoManager.curRepo}/${BLOBS_PATH}/${curBranch.stagedFiles[file].hash}`,
          );
        }
      }
      curBranch.stagedFiles = {};

      metadataStore.save(data);
    } else {
      console.info("No changes found.");
    }
  } else {
    console.error("Current Repo Missing!");
  }
}

function checkDiff(file, fileHash) {
  if (
    !repoManager.snapshot[file] ||
    repoManager.snapshot[file].hash !== fileHash
  ) {
    return true;
  } else {
    return false;
  }
}

function logCommitHistory() {
  let commits =
    data.repos[repoManager.curRepo].branches[repoManager.curBranch].commits;

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
  if (repoManager.curRepo) {
    let numOfChanges = 0;

    let files = fs.readdirSync(`${repoManager.curRepo}`);
    let curBranch =
      data.repos[repoManager.curRepo].branches[repoManager.curBranch];
    let commits = curBranch.commits;

    for (let file of files) {
      const isDir = checkIsDir(file);
      if (isDir) {
        continue;
      }

      let fileHash = hashFileContent(`${repoManager.curRepo}/${file}`);

      let isDiff = checkDiff(file, fileHash);
      if (isDiff) {
        console.info(`Modified: ${repoManager.curRepo}/${file}`);
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

// Removes deleted files from the main data file
function removeDeletedFiles(branch) {
  for (let file of Object.keys(branch.snapshot)) {
    if (
      !fs.existsSync(`${repoManager.curRepo}/${file}`) &&
      branch.snapshot[file].state !== "deleted"
    ) {
      branch.stagedFiles[file] = {
        hash: branch.snapshot[file].hash,
        state: "deleted",
      };

      metadataStore.save(data);
      console.log("File ", file, " Was not found");
    }
  }
}

function stageFiles(files) {
  let stagedFiles = files;

  const curBranch =
    data.repos[repoManager.curRepo].branches[repoManager.curBranch];

  // Check if a file was deleted, if it is deleted
  // then remove it from the main data file
  removeDeletedFiles(curBranch);

  if (!stagedFiles.length) {
    return;
  }

  if (repoManager.curRepo) {
    if (stagedFiles[0] === ".") {
      stagedFiles = fs.readdirSync(`${repoManager.curRepo}`);
      console.info("Add All changed files");
    }

    let numOfChanges = 0;

    for (let file of stagedFiles) {
      const isDir = checkIsDir(file);
      if (isDir) {
        continue;
      }

      let fileHash = hashFileContent(`${repoManager.curRepo}/${file}`);

      if (
        (curBranch.stagedFiles[file]?.hash !== fileHash &&
          repoManager.snapshot[file]?.hash !== fileHash) ||
        repoManager.snapshot[file]?.state === "deleted"
      ) {
        console.log("Something is Fishy...");
        let isDiff = checkDiff(file, fileHash);
        if (isDiff) {
          curBranch.stagedFiles[file] = {
            hash: fileHash,
            state: "present",
          };
          numOfChanges++;
        }
      }
    }

    if (numOfChanges) {
      metadataStore.save(data);
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

handleActions();
