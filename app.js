import fs from "node:fs";

let localRepo = "x";
let remoteRepo = "sys";
const defaultBranch = "main";
let curBranch = defaultBranch;
let repos = [];

function createRepo(repoName) {
  let repoRes = createDir(repoName);
  let branchRes = createBranch(defaultBranch, repoName);

  if (repoRes && branchRes) {
    console.log(`Repository ${repoName} created Successfully!`);
    let newObj = {};
    newObj[repoName] = [defaultBranch];
    repos.push(newObj);
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
    if (fs.existsSync("data.json") === false) {
      fs.writeFileSync("data.json", JSON.stringify(repos, null, 2));
      console.log("Data Appended Successfully!");
      return;
    }

    const data = fs.readFileSync("data.json");
    let json = JSON.parse(data);

    for (let repo of repos) {
      console.log(repo);
      json.push(repo);
    }

    fs.writeFileSync("data.json", JSON.stringify(json, null, 2));
    console.log("Data Appended Successfully!");
  } catch (error) {
    console.error("Error updating file: " + error);
  }
}

function listRepos() {
  for (let [repoName, branches] of repos.entries()) {
    console.log(`Repo Name: ${repoName}, branches: ${branches}`);
  }
}

function checkout(repoName, branchName) {}

function createBranch(branchName, repoName) {
  let res = createDir(`${repoName || localRepo}/${branchName}`);

  if (res) {
    console.log(`Branch ${branchName} created Successfully!`);
    repos;
    return res;
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
    case "list-repos":
      listRepos();
      break;
    default:
      console.log("Unknown action, Try again");
  }
}

handleActions();
