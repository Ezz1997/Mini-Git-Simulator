class RepositoryManager {
  constructor(data) {
    this.data = data;
  }

  get curRepo() {
    return this.data.HEAD.repo;
  }

  get curBranch() {
    return this.data.HEAD.branch;
  }

  get snapshot() {
    return this.data.repos[this.curRepo].branches[this.curBranch].snapshot;
  }

  set createBranch(branchName) {
    if (branchName) {
      this.data.repos[this.curRepo].branches[branchName] = {
        stagedFiles: {},
        snapshot: {},
        commits: [],
      };
    } else {
      console.error("Failed to create new branch");
    }
  }
}

export { RepositoryManager };
