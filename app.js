import fs from "node:fs";

let curRepo = "x";
let reposList = [];

function createRepo(repoName) {
  let res = createDir(repoName);

  if (res) {
    console.log(`Repository ${repoName} created Successfully!`);
    reposList.push(repoName);
  }

  if (res === false) {
    console.log("Another repository with same name already exists.");
  }

  if (res === undefined) {
    console.error("Failed to create new repository");
  }
}

function createBranch(branchName) {
  let res = createDir(`${curRepo}/${branchName}`);

  if (res) {
    console.log(`Branch ${branchName} created Successfully!`);
  }

  if (res === false) {
    console.log("Another branch with same name already exists.");
  }

  if (res === undefined) {
    console.error("Failed to create new branch");
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
  default:
    console.log("Unknown action, Try again");
}
