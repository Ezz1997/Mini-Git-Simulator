const METADATA_FILE_NAME = "data.json";
import fs from "node:fs";

class MetadataStore {
  save(data) {
    try {
      fs.writeFile(METADATA_FILE_NAME, JSON.stringify(data, null, 2));
      console.info("Data Appended Successfully!");
      return true;
    } catch (error) {
      console.error("Error updating file: " + error);
      return false;
    }
  }

  load() {
    try {
      if (fs.existsSync(METADATA_FILE_NAME)) {
        const readData = fs.readFile(METADATA_FILE_NAME);
        let json = JSON.parse(readData);

        return json;
      } else {
        console.error("File was not found");
      }
    } catch (error) {
      console.error("Error reading file: " + error);
    }
  }
}

export { MetadataStore };
