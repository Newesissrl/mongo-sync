require("dotenv").config();
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
const { MONGODB_DUMP_PATH } = process.env;
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
      console.log(`Dump done: ${result}`);
      dateDumped.push(yesterdayCollectionSuffix);
    }
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

  // open a Change Stream on the collection
  changeStream = sourceCollection.watch({ fullDocument: "updateLookup" });
  console.log(
    `Waiting for changes on "${sourceDatabase.databaseName}.${sourceCollection.collectionName}"`
  );

  // set up a listener when change events are emitted
  changeStream.on("change", async (next) => {
    const { fullDocument, operationType } = next;
    if (DEBUG) {
      console.log(
        `Received operationType: "${operationType}" ${
          fullDocument._id ? `for _id: "${fullDocument._id}"` : ""
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
