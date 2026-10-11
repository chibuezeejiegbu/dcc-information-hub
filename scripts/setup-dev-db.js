
require("dotenv").config();

const { MongoClient } = require("mongodb");

const DEVELOPMENT_DB_NAME = "dcc_information_hub_dev";

async function setupDevelopmentDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing. Configure it in your local environment."
    );
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();

    // Explicitly select the development database.
    // Do not use the database name embedded in the connection URI.
    const db = client.db(DEVELOPMENT_DB_NAME);

    if (db.databaseName !== DEVELOPMENT_DB_NAME) {
      throw new Error("Unexpected database name. Setup cancelled.");
    }

    console.log(`Preparing database: ${DEVELOPMENT_DB_NAME}`);

    const existingCollections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    const existingNames = new Set(
      existingCollections.map((collection) => collection.name)
    );

    const requiredCollections = [
      "events",
      "cms_admins",
      "cms_audit_logs"
    ];

    for (const name of requiredCollections) {
      if (!existingNames.has(name)) {
        await db.createCollection(name);
        console.log(`Created collection: ${name}`);
      } else {
        console.log(`Collection already exists: ${name}`);
      }
    }

    // Indexes for event management.
    await db.collection("events").createIndex({
      publication_status: 1,
      start_date: 1
    });

    // Admin usernames must be unique.
    await db.collection("cms_admins").createIndex(
      { username: 1 },
      { unique: true }
    );

    // Keep an auditable timeline of administrative actions.
    await db.collection("cms_audit_logs").createIndex({
      created_at: -1
    });

    console.log("Development database setup completed.");
    console.log("No live records were copied or deleted.");
  } finally {
    await client.close();
  }
}

setupDevelopmentDatabase().catch((error) => {
  console.error("Development database setup failed:", error.message);
  process.exitCode = 1;
});
