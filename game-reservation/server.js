const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Connection URI
const uri = `mongodb+srv://nks676:${process.env.DB_PASSWORD}@eggert.a6kxlho.mongodb.net/?retryWrites=true&w=majority&appName=Eggert`;

// Create a new MongoClient
const client = new MongoClient(uri);

// Database Name
const dbName = "eclipse_gaming";

const adminEmails = ["rchavali@g.ucla.edu", "nks676@g.ucla.edu"];

async function connectToDatabase() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Connected successfully to MongoDB");

    const db = client.db(dbName);

    // Create collections if they don't exist
    await db.createCollection("users");
    await db.createCollection("reservations");
    await db.createCollection("games");
    await db.createCollection("queue");

    console.log("Database setup completed");
    return db;
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
    throw err;
  }
}

// Basic test route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.get("/api/view/reservations", async (req, res) => {
  try {
    const db = client.db(dbName);
    const reservations = await db.collection("reservations").find({}).toArray();
    res.json(reservations);
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/create/user", async (req, res) => {
  try {
    // alert("Received request:", req.body);
    console.log("Received request:", req.body);
    const db = client.db(dbName);
    const { email, role } = req.body;

    // Check if the user already exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    // Create a new user

    const user = {
      email,
      role,
      createdAt: new Date(),
    };
    const result = await db.collection("users").insertOne(user);
    res.status(201).json({
      message: "User created",
      userId: result.insertedId,
    });
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/create/reservation", async (req, res) => {
  try {
    console.log("Received request:", req.body);
    const db = client.db(dbName);
    const { name, email, game, mode, consoleType, pcLetter } = req.body;
    // Prevent duplicate reservation for same user and queue
    const query = { email, mode };
    if (mode === "CONSOLE") {
      query.consoleType = consoleType;
    }
    const existing = await db.collection("reservations").findOne(query);
    if (existing) {
      return res
        .status(400)
        .json({ message: "You already have a reservation for this queue." });
    }
    const reservation = {
      name,
      email,
      game,
      mode,
      createdAt: new Date(),
    };
    if (mode === "CONSOLE") {
      reservation.consoleType = consoleType;
      reservation.currentConsole = null;
    }

    if (mode === "PC") {
      reservation.pcLetter = pcLetter;
      reservation.onCurrentPC = false;
    }

    const result = await db.collection("reservations").insertOne(reservation);
    res.status(201).json({
      message: "Reservation created",
      reservationId: result.insertedId,
    });
  } catch (err) {
    console.error("Error fetching reservations:", err);
    res.status(500).send("Internal Server Error");
  }
});
app.delete("/api/delete/reservation", async (req, res) => {
  try {
    const db = client.db(dbName);
    const { reservationId, userEmail, userRole } = req.body;
    if (!reservationId || !userEmail || !userRole) {
      return res
        .status(400)
        .json({ message: "Missing reservationId, userEmail, or userRole" });
    }
    const reservation = await db
      .collection("reservations")
      .findOne({ _id: new ObjectId(reservationId) });
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    } // Only allow if admin or owner (case-insensitive)
    if (
      userRole !== "ADMIN" &&
      reservation.email.toLowerCase() !== userEmail.toLowerCase()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this reservation" });
    }
    await db
      .collection("reservations")
      .deleteOne({ _id: new ObjectId(reservationId) });
    res.json({ message: "Reservation deleted" });
  } catch (err) {
    console.error("Error deleting reservation:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/api/move/pc/reservation", async (req, res) => {
  console.log("Received request:", req.body);
  try {
    const db = client.db(dbName);
    const { reservationId, onCurrentPC } = req.body;
    if (!reservationId) {
      return res
        .status(400)
        .json({ message: "Missing reservationId" });
    }

    // if someone else is using the same PC, return error

    const existingReservation = await db
      .collection("reservations")
      .findOne({ onCurrentPC: true });
    if (existingReservation) {
      return res
        .status(400)
        .json({ message: "PC is already in use by another reservation" });
    }

    // change reservation from onCurrentPC to true

    const reservation = await db
      .collection("reservations")
      .findOne({ _id: new ObjectId(reservationId), onCurrentPC: false });
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    await db
      .collection("reservations")
      .updateOne(
        { _id: new ObjectId(reservationId) },
        { $set: { onCurrentPC: true } }
      );
    res.status(201).json({ message: "Reservation moved" });


  } catch (err) {
    console.error("Error moving reservation:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
})

app.post("/api/move/console/reservation", async (req, res) => {
  console.log("Received request:", req.body);
  try {
    const db = client.db(dbName);
    const { reservationId, currentConsole } = req.body;
    if (!reservationId || !currentConsole) {
      return res
        .status(400)
        .json({ message: "Missing reservationId or newConsoleType" });
    }

    // if someone else is using the console, return error
    const existingReservation = await db
      .collection("reservations")
      .findOne({ currentConsole: currentConsole });
    if (existingReservation) {
      return res
        .status(400)
        .json({ message: "Console is already in use by another reservation" });
    }

    const reservation = await db
      .collection("reservations")
      .findOne({ _id: new ObjectId(reservationId) });
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    await db
      .collection("reservations")
      .updateOne(
        { _id: new ObjectId(reservationId) },
        { $set: { currentConsole: currentConsole } }
      );
    res.json({ message: "Reservation moved" });
  } catch (err) {
    console.error("Error moving reservation:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



// Start the server
const port = 8080;

async function startServer() {
  try {
    const db = await connectToDatabase();

    // Start listening
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
