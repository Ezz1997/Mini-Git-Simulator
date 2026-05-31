import crypto from "crypto";
import { readFile } from "./fs.js";

function hashFileContent(src) {
  let data = readFile(src);

  // Create a hash object
  const hash = crypto.createHash("sha1");

  // Update the hash with data
  hash.update(data);

  return hash.digest("hex");
}

export { hashFileContent };
