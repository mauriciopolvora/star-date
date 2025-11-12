/**
 * Preprocess GCNS VOTable to binary position and magnitude arrays
 * Output: gcns-positions.bin (Float32Array of [x,y,z] per star)
 *         gcns-mag.bin (Float32Array of magnitudes)
 */

import fs, { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import SAXParser from "sax";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const votPath = path.join(
  projectRoot,
  "public/catalog-gcns/catalog/gcns/gcns.vot",
);
const outputDir = path.join(projectRoot, "public/catalog-gcns");

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Stream parse VOTable using SAX parser
 */
async function parseVOTableStream(filePath) {
  return new Promise((resolve, reject) => {
    const positions = [];
    const magnitudes = [];
    const fieldNames = [];
    let xIndex = -1,
      yIndex = -1,
      zIndex = -1,
      magIndex = -1;
    let inTableData = false;
    let inRow = false;
    let currentRowValues = [];
    let rowCount = 0;

    const parser = SAXParser.createStream(true);

    parser.on("opentag", (node) => {
      if (node.name === "FIELD") {
        fieldNames.push(node.attributes.name);
      } else if (node.name === "TABLEDATA") {
        inTableData = true;
        console.log("Starting to parse table data...");

        // Set indices after all fields have been collected
        xIndex = fieldNames.indexOf("xcoord_50");
        yIndex = fieldNames.indexOf("ycoord_50");
        zIndex = fieldNames.indexOf("zcoord_50");
        magIndex = fieldNames.indexOf("phot_g_mean_mag");

        if (xIndex === -1 || yIndex === -1 || zIndex === -1) {
          reject(
            new Error(
              "Missing coordinate fields (xcoord_50, ycoord_50, zcoord_50) in VOTable",
            ),
          );
        }
      } else if (node.name === "TR" && inTableData) {
        inRow = true;
        currentRowValues = [];
      }
    });

    parser.on("text", (text) => {
      if (inRow) {
        const trimmed = text.trim();
        if (trimmed) {
          currentRowValues.push(trimmed);
        }
      }
    });

    parser.on("closetag", (nodeName) => {
      if (nodeName === "TR" && inRow) {
        inRow = false;
        if (currentRowValues.length > 0) {
          const x = parseFloat(currentRowValues[xIndex]);
          const y = parseFloat(currentRowValues[yIndex]);
          const z = parseFloat(currentRowValues[zIndex]);
          const mag =
            magIndex !== -1 ? parseFloat(currentRowValues[magIndex]) : 0;

          if (!Number.isNaN(x) && !Number.isNaN(y) && !Number.isNaN(z)) {
            positions.push(x, y, z);
            magnitudes.push(mag);
          }

          rowCount++;
          if (rowCount % 50000 === 0) {
            console.log(`Processed ${rowCount} rows...`);
          }
        }
      } else if (nodeName === "TABLEDATA") {
        inTableData = false;
      }
    });

    parser.on("end", () => {
      console.log(`Total valid stars: ${positions.length / 3}`);
      resolve({ positions, magnitudes });
    });

    parser.on("error", (err) => {
      reject(err);
    });

    createReadStream(filePath).pipe(parser);
  });
}

/**
 * Write binary files
 */
function writeBinaryFiles(positions, magnitudes, outputDir) {
  // Convert to Float32Array
  const posBuffer = new Float32Array(positions);
  const magBuffer = new Float32Array(magnitudes);

  // Write positions
  const posPath = path.join(outputDir, "gcns-positions.bin");
  fs.writeFileSync(posPath, Buffer.from(posBuffer.buffer));
  console.log(`Wrote positions to ${posPath} (${posBuffer.length} floats)`);

  // Write magnitudes
  const magPath = path.join(outputDir, "gcns-mag.bin");
  fs.writeFileSync(magPath, Buffer.from(magBuffer.buffer));
  console.log(`Wrote magnitudes to ${magPath} (${magBuffer.length} floats)`);
}

/**
 * Main
 */
async function main() {
  console.log("Parsing VOTable (streaming)...");
  if (!fs.existsSync(votPath)) {
    console.error(`VOTable not found at ${votPath}`);
    process.exit(1);
  }

  try {
    const { positions, magnitudes } = await parseVOTableStream(votPath);
    writeBinaryFiles(positions, magnitudes, outputDir);
    console.log("✓ Preprocessing complete!");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
