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
}

export { RepositoryManager };
