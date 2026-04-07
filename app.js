import fs from "node:fs";

let userRepo = "x";
let systemRepo = "sys";
const defaultBranch = "main";

function createRepo(repoName) {
  let repoRes = createDir(repoName);
  let branchRes = createBranch(defaultBranch, repoName);

  if (repoRes && branchRes) {
    console.log(`Repository ${repoName} created Successfully!`);
  }

  if (repoRes === false) {
    console.log("Another repository with same name already exists.");
  }

  if (repoRes === undefined) {
    console.error("Failed to create new repository");
  }
}

function createBranch(branchName, repoName) {
  let res = createDir(`${repoName || userRepo}/${branchName}`);

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

function commitChanges() {
  let res = fs.readdirSync(`${userRepo}/main`);
  let fileName = "story_version";

  fileName += res.length;

  const lastSavedVersion = readFile(`${userRepo}/main/${res[res.length - 1]}`);
  const currentVersion = readFile("story.txt");

  if (lastSavedVersion !== currentVersion) {
    copyFile("story.txt", `${userRepo}/main/${fileName}.txt`);
    copyFile("story.txt", `${systemRepo}/main/${fileName}.txt`);
  } else {
    console.info("No changes found.");
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
    commitChanges();
    break;
  default:
    console.log("Unknown action, Try again");
}
