require("dotenv").config();
const { spawn } = require("node:child_process");

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const { MONGODB_DUMP_CLOUD_LOCATION } = process.env;
const MONGODB_DUMP_PATH = process.env.MONGODB_DUMP_PATH || "dumps";
const MONGODB_SOURCE_DATABASE = process.env.MONGODB_SOURCE_DATABASE || "app";
const MONGODB_DEST_DATABASE =
  process.env.MONGODB_DEST_DATABASE || MONGODB_SOURCE_DATABASE;
const MONGODB_DUMP_HOURS = +(process.env.MONGODB_DUMP_HOURS || 1);
const DEBUG = +(process.env.DEBUG || 0) === 1;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://localhost?readPreference=primary&replicaSet=rs0&ssl=false";
const client = new MongoClient(MONGODB_URI);
console.log(`DEBUG: ${DEBUG}`);
console.log(`MONGODB_DUMP_HOURS: ${MONGODB_DUMP_HOURS}`);

const dateDumped = [];
function getCollectionSuffixByDate(dt) {
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(dt.getDate()).padStart(2, "0")}`;
}
async function startDumpProcess(destDatabase, mongoTools) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayCollectionSuffix = getCollectionSuffixByDate(yesterday);
  if (dateDumped.includes(yesterdayCollectionSuffix)) {
    return;
  }
  const yesterdayCollectionName = `${process.env.MONGODB_DEST_COLLECTION}_${yesterdayCollectionSuffix}`;
  const collections = await destDatabase
    .listCollections({ name: yesterdayCollectionName }, { nameOnly: true })
    .toArray();
  if (!collections.length) {
    console.log(
      `No yesterday collection: "${yesterdayCollectionName}" found. Skipping dump`
    );
    dateDumped.push(yesterdayCollectionSuffix);
    return;
  }
  const fileName = `${yesterdayCollectionName}.tgz`;
  const dumpFullPath = path.join(MONGODB_DUMP_PATH, fileName);
  if (fs.existsSync(dumpFullPath)) {
    console.info(
      `Dump for yesterday collection: "${yesterdayCollectionName}" found: ${dumpFullPath}. Not proceeding further.`
    );
    dateDumped.push(yesterdayCollectionSuffix);
    return;
  }
  if (DEBUG) {
    console.log(`Dumping yesterday collection: "${yesterdayCollectionName}"`);
  }
  try {
    const result = await mongoTools.mongodump({
      db: MONGODB_DEST_DATABASE,
      uri: MONGODB_URI,
      path: MONGODB_DUMP_PATH,
      fileName: fileName,
      collection: yesterdayCollectionName,
    });
    if (DEBUG) {
      console.log(`Dump done: ${result.message}`);
    }
    dateDumped.push(yesterdayCollectionSuffix);
    if (!MONGODB_DUMP_CLOUD_LOCATION) {
      console.error(
        "No 'MONGODB_DUMP_CLOUD_LOCATION' key have been provided. Skipping."
      );
      return;
    }
    if (DEBUG) {
      console.log(`Executing ./git-sync.sh ${fileName}`);
    }
    const gitSync = spawn("./git-sync.sh", [fileName]);
    gitSync.stdout.on("data", (data) => {
      console.log(data.toString());
    });

    gitSync.stderr.on("data", (data) => {
      console.log(data.toString());
    });
    gitSync.on("close", (code) => {
      if (code === 0) {
        destDatabase.dropCollection(yesterdayCollectionName);
        if (DEBUG) {
          console.log(
            `Dropped yesterday collection: ${yesterdayCollectionName}`
          );
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
}
async function main() {
  const { MongoTools } = await import("node-mongotools");
  const mongoTools = new MongoTools();
  console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
  await client.connect();

  console.log("Connected to MongoDB");
  const sourceDatabase = client.db(MONGODB_SOURCE_DATABASE);
  const sourceCollection = sourceDatabase.collection(
    process.env.MONGODB_SOURCE_COLLECTION
  );

  const destDatabase = client.db(MONGODB_DEST_DATABASE);

  changeStream = sourceCollection.watch({ fullDocument: "updateLookup" });
  console.log(
    `Waiting for changes on "${sourceDatabase.databaseName}.${sourceCollection.collectionName}"`
  );

  changeStream.on("change", async (next) => {
    const { fullDocument, operationType } = next;
    if (DEBUG) {
      console.log(
        `Received operationType: "${operationType}" ${
          fullDocument ? `for _id: "${fullDocument._id}"` : ""
        }`
      );
    }
    if (operationType !== "insert") {
      return;
    }
    const today = new Date();
    const collectionSuffix = getCollectionSuffixByDate(today);
    const destCollection = destDatabase.collection(
      `${process.env.MONGODB_DEST_COLLECTION}_${collectionSuffix}`
    );
    await destCollection.insertOne(fullDocument);
    if (today.getHours() === MONGODB_DUMP_HOURS) {
      startDumpProcess(destDatabase, mongoTools);
    }
  });
}
main();
