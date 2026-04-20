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
  if (!data.HEAD.repo) {
    console.error("Can't create a branch without a parent repo");
    return;
  }

  let res = createDir(`${repoName || localRepo}/${branchName}`);

  if (res) {
    data.repos[data.HEAD.repo].branches[branchName] = { commits: [] };
    saveJsonFile();
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

function createRepo(repoName) {
  if (!data.HEAD.repo) {
    data.HEAD.repo = repoName;
  }
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

function commitChanges() {
  let res = fs.readdirSync(`${localRepo}/main`);
  let fileName = "story_version";

  fileName += res.length;

  const lastSavedVersion = readFile(`${localRepo}/main/${res[res.length - 1]}`);
  const currentVersion = readFile("story.txt");

  if (lastSavedVersion !== currentVersion) {
    copyFile("story.txt", `${localRepo}/main/${fileName}.txt`);
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

function pushChanges() {
  let remoteRes = fs.readdirSync(`${remoteRepo}/main`);
  let localRes = fs.readdirSync(`${localRepo}/main`);
  let fileName = localRes[localRes.length - 1];

  const localVersion = readFile(
    `${localRepo}/main/${localRes[localRes.length - 1]}`,
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
      commitChanges();
      break;
    case "push":
      pushChanges();
      break;
    default:
      console.log("Unknown action, Try again");
  }
}

initMetaData();
handleActions();
