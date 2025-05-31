const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const nodemailer = require("nodemailer");

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Connection URI
const uri = `mongodb+srv://nks676:${process.env.DB_PASSWORD}@eggert.a6kxlho.mongodb.net/?retryWrites=true&w=majority&appName=Eggert`;

console.log('MongoDB URI:', uri);

// Create a new MongoClient
const client = new MongoClient(uri);

// Database Name
const dbName = "eclipse_gaming";

const adminEmails = ["rchavali@g.ucla.edu", "nks676@g.ucla.edu", "nikhildewitt@g.ucla.edu"];

// Define valid status options
const VALID_STATUSES = ['Online', 'Offline', 'In Game', 'Away', 'Busy'];

// Log environment variables for debugging Nodemailer
console.log("DEBUG: EMAIL_USER from .env:", process.env.EMAIL_USER);
console.log("DEBUG: EMAIL_PASS from .env (length only):", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "undefined");

// Nodemailer transporter setup (using environment variables)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address from .env
    pass: process.env.EMAIL_PASS, // Your Gmail App Password from .env
  },
});

// Function to send email
async function sendEmail(to, subject, text) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    // Do not throw error here to allow main operation to continue if email fails
  }
}

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
    await db.createCollection("profiles");

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

app.get("/api/view/profiles", async (req, res) => {
  try {
    const db = client.db(dbName);
    // Only return profiles that are open to friends
    const profiles = await db.collection("profiles").find({ openToFriends: true }).toArray();
    res.json(profiles);
  } catch (err) {
    console.error("Error fetching profiles:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/view/profile", async (req, res) => {
  try {
    const db = client.db(dbName);
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Missing email query parameter" });
    }
    const profile = await db.collection("profiles").findOne({ email });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(profile);
  } catch (err) {
    console.error("Error fetching profile:", err);
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
    const { reservationId, pcLetter, onCurrentPC } = req.body;
    if (!reservationId || !pcLetter) {
      return res
        .status(400)
        .json({ message: "Missing reservationId" });
    }

    // if someone else is using the same PC, return error

    const existingReservation = await db
      .collection("reservations")
      .findOne({ pcLetter: pcLetter, onCurrentPC: true });
    if (existingReservation) {
      return res
        .status(400)
        .json({ message: "PC is already in use by another reservation" });
    }

    // change reservation from onCurrentPC to true

    const reservation = await db
      .collection("reservations")
      .findOne({ _id: new ObjectId(reservationId), pcLetter: pcLetter, onCurrentPC: false });
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found" });
    }
    await db
      .collection("reservations")
      .updateOne(
        { _id: new ObjectId(reservationId) },
        { $set: { pcLetter: pcLetter, onCurrentPC: true } }
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

app.post("/api/create/profile", async (req, res) => {
  try {
    console.log("Received request:", req.body);
    const db = client.db(dbName);
    const { name, email, game, mode, time } = req.body;

    // Enforce only one profile per user
    const existing = await db.collection("profiles").findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "You already have a profile setup." });
    }

    const profile = {
      name,
      email,
      game,
      mode,
      time,
      openToFriends: false, // Set default to false
      createdAt: new Date(),
    };

    const result = await db.collection("profiles").insertOne(profile);

    // Delete any lingering profiles with the same email but a different _id (keep only the first/oldest)
    await db.collection("profiles").deleteMany({ email, _id: { $ne: result.insertedId } });

    res.status(201).json({
      message: "Profile created",
      profileId: result.insertedId,
    });
  } catch (err) {
    console.error("Error creating profile:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/update/profile/status", async (req, res) => {
  try {
    const db = client.db(dbName);
    const { email, status } = req.body;

    if (!email || !status) {
      return res.status(400).json({ message: "Missing email or status" });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status", 
        validStatuses: VALID_STATUSES 
      });
    }

    // Upsert: create profile if it does not exist
    await db.collection("profiles").updateOne(
      { email },
      { $set: { status } },
      { upsert: true }
    );

    res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/update/profile/friends", async (req, res) => {
  try {
    const db = client.db(dbName);
    const { email, openToFriends } = req.body;

    if (!email || openToFriends === undefined) {
      return res.status(400).json({ message: "Missing email or openToFriends status" });
    }

    // Upsert: create profile if it does not exist
    await db.collection("profiles").updateOne(
      { email },
      { $set: { openToFriends } },
      { upsert: true }
    );

    res.json({ message: "Friends preference updated successfully" });
  } catch (err) {
    console.error("Error updating friends preference:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/update/profile", async (req, res) => {
  try {
    const db = client.db(dbName);
    const { email, ...fieldsToUpdate } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Missing email" });
    }
    if (Object.keys(fieldsToUpdate).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Only allow updating certain fields
    const allowedFields = ["name", "game", "mode", "time"];
    const update = {};
    for (const key of allowedFields) {
      if (fieldsToUpdate[key] !== undefined) {
        update[key] = fieldsToUpdate[key];
      }
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const result = await db.collection("profiles").updateOne(
      { email },
      { $set: update },
      { upsert: false }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Internal Server Error");
  }
});

// New endpoint to handle adding a friend (actual friend logic like DB update to be added)
app.post('/api/friends/add', async (req, res) => {
  const { requestorEmail, friendProfileId } = req.body;
  console.log(`Friend add request from ${requestorEmail} for profile ID ${friendProfileId}`);
  // In a full implementation, you would update your database here to establish the friend relationship.
  // For now, we'll just acknowledge the request.
  // Example:
  // const db = client.db(dbName);
  // await db.collection("users").updateOne({ email: requestorEmail }, { $addToSet: { friends: friendProfileId } });
  // await db.collection("users").updateOne({ _id: new ObjectId(friendProfileId) }, { $addToSet: { friendOf: requestorEmail } }); // Or similar logic
  res.status(200).json({ message: 'Friend add request received' });
});

// Corrected endpoint to send email when a user is added as a friend
app.post('/api/friends/request', async (req, res) => {
  const { requestorName, friendProfileId, customMessage } = req.body;
  let friendEmail;
  // let friendName; // Optional: for logging or more personalized fallback

  try {
    const db = client.db(dbName);

    if (friendProfileId === "dummy-nikhil") {
      // Handle the dummy profile directly
      friendEmail = "nikhildewitt@g.ucla.edu"; // Updated email for the dummy profile
      // friendName = "Nikhil (Dummy)"; // For clarity if needed elsewhere
      if (!friendEmail) { // Should not happen if hardcoded correctly
          console.error("Dummy profile email is not configured on the server."); // Server-side log
          return res.status(500).json({ message: 'Dummy friend profile email configuration error on server' });
      }
    } else {
      // For actual profiles, look up in DB
      let mongoObjectId;
      try {
        // Ensure ObjectId is required if not already at the top of the file
        // const { ObjectId } = require("mongodb"); // Usually at the top
        mongoObjectId = new ObjectId(friendProfileId);
      } catch (bsonError) {
        // This catches if friendProfileId is not a valid format for ObjectId
        console.error('Invalid friendProfileId format for ObjectId:', friendProfileId, bsonError.message);
        return res.status(400).json({ message: `Invalid friendProfileId format. It must be a 24 character hex string.` });
      }

      const friendProfile = await db.collection("profiles").findOne({ _id: mongoObjectId });

      if (!friendProfile) {
        return res.status(404).json({ message: 'Friend profile not found for ID: ' + friendProfileId });
      }
      if (!friendProfile.email) {
        return res.status(400).json({ message: 'Friend profile (' + friendProfileId + ') does not have an email address' });
      }
      friendEmail = friendProfile.email;
      // friendName = friendProfile.name;
    }

    const subject = 'New Friend Request';
    let text = `${requestorName} has added you as a friend on Eclipse Gaming!`;
    if (customMessage && customMessage.trim() !== "") {
      text += `\n\nThey sent you a message:\n${customMessage.trim()}`;
    }

    // console.log("!!!! MARKER: ABOUT TO CALL sendEmail !!!!");
    await sendEmail(friendEmail, subject, text);
    // console.log(`Email to be sent to: ${friendEmail}, Subject: ${subject}, Text: ${text}`);

    res.status(200).json({ message: 'Friend request email process initiated' });
  } catch (error) {
    // General error catch for other unexpected issues
    console.error('Error processing friend request email:', error);
    // Removed the problematic 'instanceof ObjectId.InvalidId' check.
    // The BSONError for invalid ID format is now handled above for non-dummy IDs.
    // For other errors (like sendEmail failure itself), a generic 500 is appropriate.
    res.status(500).json({ message: 'Error processing friend request email. Details: ' + error.message });
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
