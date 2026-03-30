import fs from "node:fs";

function createRepo(repoName) {
  try {
    if (!fs.existsSync(repoName)) {
      fs.mkdirSync(repoName);
      console.log(`Repository ${repoName} created Successfully!`);
    } else {
      console.log("Another repository with same name already exists.");
    }
  } catch (err) {
    console.error("Failed to create new repository");
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
  default:
    console.log("Unknown action, Try again");
}
