import fs from "node:fs";
import { checkIsDir } from "./utils/fs.js";
import { MetadataStore } from "./storage/MetadataStore.js";
import { copyFile } from "./utils/fs.js";

const BLOBS_PATH = ".ezgit/objects";

class RepositoryManager {
  constructor(data, store) {
    this.data = data;
    this.store = store;
  }

  get curRepo() {
    return this.data.HEAD.repo;
  }

  get curBranch() {
    return this.data.repos[this.curRepo].branches[this.curBranchName];
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
