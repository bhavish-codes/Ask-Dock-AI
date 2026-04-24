const fs=require("fs");
const path=require("path");

function readDocument(){
  try {
    const filePath = path.join(process.cwd(), "data", "sample-doc.txt");
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
    
    const fallbackPath = path.join(__dirname, "../../data/sample-doc.txt");
    return fs.readFileSync(fallbackPath, "utf-8");
  } catch (error) {
    console.warn("Could not read document:", error.message);
    return "";
  }
}

module.exports={readDocument};
