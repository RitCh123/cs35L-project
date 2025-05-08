const { MongoClient } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());

// Connection URI
const uri = `mongodb+srv://nks676:${process.env.DB_PASSWORD}@eggert.a6kxlho.mongodb.net/?retryWrites=true&w=majority&appName=Eggert`;

// Create a new MongoClient
const client = new MongoClient(uri);

// Database Name
const dbName = 'eclipse_gaming';

async function connectToDatabase() {
    try {
        // Connect the client to the server
        await client.connect();
        console.log("Connected successfully to MongoDB");

        const db = client.db(dbName);

        // Create collections if they don't exist
        await db.createCollection('users');
        await db.createCollection('reservations');
        await db.createCollection('games');
        await db.createCollection('queue');

        console.log("Database setup completed");
        return db;

    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
        throw err;
    }
}

// Basic test route
app.get('/', (req, res) => {
    res.send('Server is running!');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date() });
});

// Start the server
const port = 8080;

async function startServer() {
    try {
        const db = await connectToDatabase();
        
        // Start listening
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
            console.log(`Test the API with:
            - Basic test: curl http://localhost:${port}/
            - Health check: curl http://localhost:${port}/api/health`);
        });

    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

startServer(); 