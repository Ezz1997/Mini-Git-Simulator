import fs from "node:fs";
import { checkIsDir, isFileExists, copyFile } from "./utils/fs.js";
import { MetadataStore } from "./storage/MetadataStore.js";

const BLOBS_PATH = ".ezgit/objects";

class Commit {
  constructor(message, parent = null) {
    this.id = crypto.randomUUID();
    this.message = message;
    this.date = new Date();
    this.repo = this.curRepo;
    this.branch = this.curBranchName;
    this.parent = parent;
  }
}

class RepositoryManager {
  constructor(data, store) {
    this.data = data;
    this.store = store;
  }

  get curRepo() {
    return this.data.HEAD.repo;
  }

  set curRepo(repo) {
    this.data.HEAD.repo = repo;
  }

  get curBranch() {
    return this.data.repos[this.curRepo].branches[this.curBranchName];
  }

  set curBranch(branch) {
    return (this.data.repos[this.curRepo].branches[this.curBranchName] =
      branch);
  }

  get curBranchName() {
    return this.data.HEAD.branch;
  }

  set curBranchName(branch) {
    this.data.HEAD.branch = branch;
  }

  get snapshot() {
    return this.data.repos[this.curRepo].branches[this.curBranchName].snapshot;
  }

  set snapshot(newSnapshot) {
    this.data.repos[this.curRepo].branches[this.curBranchName].snapshot =
      newSnapshot;
  }

  get commits() {
    return this.data.repos[this.curRepo].branches[this.curBranchName].commits;
  }

  addCommit(commit) {
    this.data.repos[this.curRepo].branches[this.curBranchName].commits.push(
      commit,
    );
  }

  clearStagingArea() {
    this.data.repos[this.curRepo].branches[this.curBranchName].stagedFiles = {};
  }

  latestCommit() {
    let commits =
      this.data.repos[this.curRepo].branches[this.curBranchName].commits;

    return commits[commits.length - 1] || null;
  }

  logCommitHistory() {
    let commits =
      this.data.repos[this.curRepo].branches[this.curBranchName].commits;

    if (commits.length < 1) {
      return;
    }

    // print commits from newest to oldest
    for (let i = commits.length - 1; i >= 0; i--) {
      let commit = commits[i];
      console.log({
        id: commit.id,
        message: commit.message,
        date: commit.date,
      });
    }
  }

  initRepo(repoName, defaultBranch) {
    this.data.repos[repoName] = {
      branches: {
        [defaultBranch]: {
          stagedFiles: {},
          snapshot: {},
          commits: [],
        },
      },
    };
  }

  commit(commitMessage) {
    if (!commitMessage) {
      console.error("Cannot commit without a message, Try Again.");
      return;
    }

    if (this.curRepo) {
      if (
        this.curBranch.stagedFiles &&
        Object.keys(this.curBranch.stagedFiles).length > 0
      ) {
        this.snapshot = {
          ...this.snapshot,
          ...this.curBranch.stagedFiles,
        };
        let parentCommit = this.latestCommit;
        let commit = new Commit(
          commitMessage,
          parentCommit ? parentCommit.id : null,
        );
        commit.snapshot = structuredClone(this.snapshot);
        this.addCommit(commit);

        for (let file of Object.keys(this.curBranch.stagedFiles)) {
          if (
            commit.snapshot[file].state !== "deleted" &&
            !isFileExists(
              `${this.curRepo}/${BLOBS_PATH}/${this.curBranch.stagedFiles[file].hash}`,
            )
          ) {
            copyFile(
              `${this.curRepo}/${file}`,
              `${this.curRepo}/${BLOBS_PATH}/${this.curBranch.stagedFiles[file].hash}`,
            );
          }
        }
        this.clearStagingArea();

        this.store.save(this.data);
      } else {
        console.info("No changes found.");
      }
    } else {
      console.error("Current Repo Missing!");
    }
  }

  createBranch(branchName) {
    if (branchName) {
      const currentBranch =
        this.data.repos[this.curRepo].branches[this.curBranchName];

      this.data.repos[this.curRepo].branches[branchName] =
        structuredClone(currentBranch);
      return true;
    } else {
      console.error("Failed to create new branch");
      return false;
    }
  }

  checkout(branchName) {
    if (branchName === this.curBranchName) {
      return;
    }

    if (branchName && this.data.repos[this.curRepo].branches[branchName]) {
      let files = fs.readdirSync(`${this.curRepo}`);
      let snapshot =
        this.data.repos[this.curRepo].branches[branchName].snapshot;

      // Delete current branch files that don't exist or are outdated in the new branch
      for (let file of files) {
        const isDir = checkIsDir(`${this.curRepo}/${file}`);

        if (!isDir && !snapshot[file]) {
          fs.unlinkSync(`${this.curRepo}/${file}`);
          console.log("Snapshot: ", snapshot);
        }
      }

      this.curBranchName = branchName;

      // for each file put a new copy in the current directory
      for (let fileName of Object.keys(snapshot)) {
        if (snapshot[fileName].state !== "deleted") {
          copyFile(
            `${this.curRepo}/${BLOBS_PATH}/${snapshot[fileName].hash}`,
            `${this.curRepo}/${fileName}`,
          );
        }
      }

      this.store.save(this.data);
    } else {
      console.error("Branch doesn't exist.");
    }
  }
}

export { RepositoryManager };
