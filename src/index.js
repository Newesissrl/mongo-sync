require("dotenv").config();
const { MongoClient } = require("mongodb");
const DEBUG = +(process.env.DEBUG || 0) === 1;
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://localhost?readPreference=primary&replicaSet=rs0&ssl=false";
const client = new MongoClient(MONGODB_URI);
console.log(`DEBUG: ${DEBUG}`);
async function main() {
  console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
  await client.connect();
  console.log("Connected to MongoDB");
  const sourceDatabase = client.db(
    process.env.MONGODB_SOURCE_DATABASE || "app"
  );
  const sourceCollection = sourceDatabase.collection(
    process.env.MONGODB_SOURCE_COLLECTION
  );
  const destDatabase = client.db(process.env.MONGODB_DEST_DATABASE || "app");
  // open a Change Stream on the collection
  changeStream = sourceCollection.watch({ fullDocument: "updateLookup" });

  // set up a listener when change events are emitted
  changeStream.on("change", async (next) => {
    const { fullDocument, updateDescription, operationType } = next;
    if (DEBUG) {
      console.log(
        `Received operationType: "${operationType}" for _id: "${fullDocument._id}"`
      );
    }
    if (operationType !== "insert") {
      return;
    }
    const dt = new Date();
    const collectionSuffix = `${dt.getFullYear()}${String(
      dt.getMonth() + 1
    ).padStart(2, "0")}${String(dt.getDate()).padStart(2, "0")}`;
    const destCollection = destDatabase.collection(
      `${process.env.MONGODB_DEST_COLLECTION}_${collectionSuffix}`
    );
    await destCollection.insertOne(fullDocument);
  });
}
main();
