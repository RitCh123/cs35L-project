const { MongoClient } = require('mongodb');

// Connection URI
const uri = "mongodb+srv://nks676:0O4ta2EwGOu9m6PM@eggert.a6kxlho.mongodb.net/?retryWrites=true&w=majority&appName=Eggert";

// Create a new MongoClient
const client = new MongoClient(uri);

async function connectToDatabase() {
    try {
        // Connect the client to the server
        await client.connect();
        console.log("Connected successfully to MongoDB");

        // Test the connection by listing all databases
        const adminDb = client.db("admin");
        const databases = await adminDb.admin().listDatabases();
        console.log("Available databases:", databases.databases.map(db => db.name));

    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
    } finally {
        // Ensure the client will close when you finish/error
        await client.close();
    }
}

connectToDatabase(); 