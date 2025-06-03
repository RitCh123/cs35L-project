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

const adminEmails = ["rchavali@g.ucla.edu", "nks676@g.ucla.edu"];


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

// --- SEATING ALGORITHM CONFIGURATION ---
const ALL_REAL_SEATS = ["M", "L", "K", "J", "I", "H", "G", "F", "E", "D", "C", "B", "A", "Side"];
const SEAT_TOPOLOGY = {
  "M": ["L"], "L": ["M", "K"], "K": ["L", "J"], "J": ["K"],
  "I": ["H"], "H": ["I", "G"], "G": ["H"],
  "F": ["E"], "E": ["F", "D"], "D": ["E"],
  "C": ["B"], "B": ["C", "A"], "A": ["B"]
};
const APEX_LEGENDS_PCS = ["J", "M"];
const RESERVATION_DURATION_HOURS = 1;
const ADJ_QUEUE_WINDOW = 5;
const ADJ_PARTY_AGE_LIMIT_MINUTES = 10;
const TOTAL_CONSOLE_SLOTS = 2; // Added for console capacity
// --- END CONFIGURATION ---

// --- BEGIN SEATING ALGORITHM HELPER FUNCTIONS ---

async function getSeatState(db) {
  const seatState = {};
  ALL_REAL_SEATS.forEach(seatId => seatState[seatId] = null);
  const activeReservations = await db.collection("reservations").find({
    status: "active",
    reservationType: "PC",
    endTime: { $gt: new Date() }
  }).toArray();
  activeReservations.forEach(res => {
    if (res.assignedPCs && Array.isArray(res.assignedPCs)) {
      res.assignedPCs.forEach(pcId => {
        if (ALL_REAL_SEATS.includes(pcId)) {
          seatState[pcId] = res._id.toString();
        }
      });
    }
  });
  return seatState;
}

function refreshFreeBlocks(seatState, topology) {
  const freeSeats = ALL_REAL_SEATS.filter(seatId => seatState[seatId] === null);
  const components = [];
  const componentVisited = new Set();

  for (const seatId of freeSeats) {
    if (!componentVisited.has(seatId)) {
      const currentComponent = [];
      const q = [seatId];
      componentVisited.add(seatId);
      let head = 0;
      while(head < q.length) {
        const currentSeat = q[head++];
        currentComponent.push(currentSeat);
        (topology[currentSeat] || []).forEach(neighbor => {
          if (freeSeats.includes(neighbor) && !componentVisited.has(neighbor)) {
            componentVisited.add(neighbor);
            q.push(neighbor);
          }
        });
      }
      if (currentComponent.length > 0) {
        const orderedComponent = ALL_REAL_SEATS.filter(s => currentComponent.includes(s));
        components.push(orderedComponent);
      }
    }
  }
  return components;
}

async function updateReservationToActive(db, partyId, assignedSeats, notes = "") {
  const updateData = {
    status: "active",
    assignedPCs: assignedSeats,
    startTime: new Date(),
    endTime: new Date(new Date().getTime() + RESERVATION_DURATION_HOURS * 60 * 60 * 1000),
    notes: notes || "Promoted from waitlist."
  };
  await db.collection("reservations").updateOne({ _id: new ObjectId(partyId) }, { $set: updateData });
  console.log(`Reservation ${partyId} updated to active, assigned: ${assignedSeats.join(', ')}.`);
}

function canPartyUseSeats(party, seats) {
    if (party.preferredGame === "Apex Legends") {
        return seats.every(seatId => APEX_LEGENDS_PCS.includes(seatId));
    }
    return true;
}

function findBestFitBlockForAdjacent(party, freeBlocks) {
    let bestFitParentBlock = null;
    let minFittingBlockSize = Infinity;
    for (const block of freeBlocks) {
        if (block.length >= party.partySize) {
            const segment = block.slice(0, party.partySize);
            if (canPartyUseSeats(party, segment)) {
                if (block.length < minFittingBlockSize) {
                    minFittingBlockSize = block.length;
                    bestFitParentBlock = block;
                }
            }
        }
    }
    if (bestFitParentBlock) {
        return bestFitParentBlock.slice(0, party.partySize);
    }
    return null;
}

async function allocateAdjacentParties(db) {
  const seatState = await getSeatState(db);
  const freeBlocks = refreshFreeBlocks(seatState, SEAT_TOPOLOGY);
  const Q_adj_candidates = await db.collection("reservations").find({
    status: "waitlisted", reservationType: "PC", seatTogether: true 
  }).sort({ createdAt: 1 }).limit(ADJ_QUEUE_WINDOW).toArray();
  if (Q_adj_candidates.length === 0) return false;
  const sortedCandidates = Q_adj_candidates.sort((a, b) => {
    if (a.partySize !== b.partySize) return b.partySize - a.partySize;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
  for (const party of sortedCandidates) {
    const blockSegment = findBestFitBlockForAdjacent(party, freeBlocks);
    if (blockSegment) {
      await updateReservationToActive(db, party._id, blockSegment, "Promoted (adjacent) from waitlist.");
      console.log(`Adjacent party ${party._id} (${party.name}, size ${party.partySize}) seated in ${blockSegment.join(',')}.`);
      return true;
    }
  }
  return false;
}

async function allocateFlexibleParties(db) {
  const seatState = await getSeatState(db);
  let availableSingleSeats = ALL_REAL_SEATS.filter(seatId => seatState[seatId] === null);
  const Q_flex = await db.collection("reservations").find({
    status: "waitlisted", reservationType: "PC", seatTogether: false
  }).sort({ createdAt: 1 }).toArray();
  if (Q_flex.length === 0) return false;
  let anAllocationMade = false;
  for (const party of Q_flex) {
    let partySpecificAvailableSeats = availableSingleSeats;
    if (party.preferredGame === "Apex Legends") {
      partySpecificAvailableSeats = availableSingleSeats.filter(seatId => APEX_LEGENDS_PCS.includes(seatId));
    }
    if (partySpecificAvailableSeats.length >= party.partySize) {
      const seatsToAssign = partySpecificAvailableSeats.slice(0, party.partySize);
      await updateReservationToActive(db, party._id, seatsToAssign, "Promoted (flexible) from waitlist.");
      console.log(`Flexible party ${party._id} (${party.name}, size ${party.partySize}) seated in ${seatsToAssign.join(',')}.`);
      seatsToAssign.forEach(assignedSeat => { availableSingleSeats = availableSingleSeats.filter(s => s !== assignedSeat); });
      anAllocationMade = true;
    }
  }
  return anAllocationMade;
}

async function handlePartyAgeing(db) {
    const now = new Date();
    const ageLimit = new Date(now.getTime() - ADJ_PARTY_AGE_LIMIT_MINUTES * 60 * 1000);
    const oldAdjacentParties = await db.collection("reservations").find({
        status: "waitlisted", reservationType: "PC", seatTogether: true, createdAt: { $lt: ageLimit }
    }).toArray();
    let changedByAgeing = false;
    for (const party of oldAdjacentParties) {
        await db.collection("reservations").updateOne({ _id: party._id }, {
            $set: { seatTogether: false, notes: (party.notes || "") + " Aged out of adjacent preference. Now flexible." }
        });
        console.log(`Party ${party._id} (${party.name}) aged out of adjacent preference.`);
        changedByAgeing = true;
    }
    return changedByAgeing;
}

async function getActiveConsoleSlotCount(db) {
  return db.collection("reservations").countDocuments({
    status: "active",
    reservationType: "CONSOLE",
    endTime: { $gt: new Date() }
  });
}

async function allocateConsoleParties(db) {
  const activeConsoleSlots = await getActiveConsoleSlotCount(db);
  if (activeConsoleSlots >= TOTAL_CONSOLE_SLOTS) {
    return false; // No console slots available
  }

  const Q_consoles = await db.collection("reservations").find({
    status: "waitlisted",
    reservationType: "CONSOLE"
  }).sort({ createdAt: 1 }).limit(1).toArray(); // Get the oldest one

  if (Q_consoles.length === 0) {
    return false; // No consoles in waitlist
  }

  const partyToSeat = Q_consoles[0];
  // For consoles, assignedPCs is not used. We just activate them.
  await updateReservationToActive(db, partyToSeat._id, [], `Promoted (console) from waitlist for ${partyToSeat.consoleType}.`);
  console.log(`Console party ${partyToSeat._id} (${partyToSeat.name}, type ${partyToSeat.consoleType}) seated.`);
  return true; // Allocated a console party
}

async function triggerAllocationCycle(db) {
  console.log("--- Starting new allocation cycle ---");
  await handlePartyAgeing(db); // Apply PC party ageing first

  let allocationOccurredInPass = true;
  let cycleCount = 0;
  while (allocationOccurredInPass && cycleCount < 10) { // Cycle limit
    cycleCount++;
    console.log(`Allocation cycle pass #${cycleCount}`);
    allocationOccurredInPass = false; // Assume no allocation in this pass initially

    let adjPcAllocated = await allocateAdjacentParties(db);
    if (adjPcAllocated) {
      console.log("Adjacent PC party allocated. Re-evaluating entire cycle.");
      allocationOccurredInPass = true;
      continue; 
    }

    let flexPcAllocated = await allocateFlexibleParties(db);
    if (flexPcAllocated) {
      console.log("Flexible PC party allocated. Re-evaluating entire cycle.");
      allocationOccurredInPass = true;
      continue; 
    }
    
    let consoleAllocated = await allocateConsoleParties(db);
    if (consoleAllocated) {
      console.log("Console party allocated. Re-evaluating entire cycle.");
      allocationOccurredInPass = true;
      continue;
    }
    // If no allocations happened in this pass for PC-adj, PC-flex, or Console, loop terminates.
  }
  console.log("--- Allocation cycle finished --- MAX CYCLES OR NO MORE ALLOCATIONS ---");
}
// --- END SEATING ALGORITHM HELPER FUNCTIONS ---

async function connectToDatabase() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Connected successfully to MongoDB");

    const db = client.db(dbName);

    // Create collections if they don't exist
    await db.createCollection("users");
    const reservationsCollection = db.collection("reservations");
    // Ensure indexes for efficient querying
    await reservationsCollection.createIndex({ status: 1, reservationType: 1, createdAt: 1 });
    await reservationsCollection.createIndex({ email: 1 });
    await reservationsCollection.createIndex({ assignedPCs: 1 });


    await db.createCollection("games");
    // await db.createCollection("queue"); // Consolidating queue logic into reservations
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
  res.send("Server is running with new allocation logic!");
});

app.get("/api/view/reservations", async (req, res) => {
  try {
    const db = client.db(dbName);
    const reservations = await db.collection("reservations").find({}).sort({ createdAt: -1 }).toArray();
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
    console.log("Received user creation request:", req.body);
    const db = client.db(dbName);
    const { email } = req.body; // Role will be determined by adminEmails

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return res.status(200).json({ message: "User already exists", userId: existingUser._id, role: existingUser.role });
    }
    
    const newUser = {
      email,
      role: adminEmails.includes(email) ? "ADMIN" : "USER",
      createdAt: new Date(),
    };
    const result = await db.collection("users").insertOne(newUser);
    res.status(201).json({
      message: "User created",
      userId: result.insertedId,
      role: newUser.role,
    });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Helper function to find available PCs
async function findAvailablePCs(db, partySize, preferredGame, seatTogether) {
  const activeReservations = await db.collection("reservations").find({
    status: "active",
    reservationType: "PC",
    endTime: { $gt: new Date() } 
  }).toArray();

  let occupiedPCs = [];
  activeReservations.forEach(res => {
    if (res.assignedPCs && res.assignedPCs.length > 0) {
      occupiedPCs = occupiedPCs.concat(res.assignedPCs);
    }
  });

  let availableCandidatePCs = ALL_REAL_SEATS.filter(pc => !occupiedPCs.includes(pc));

  if (preferredGame === "Apex Legends") {
    availableCandidatePCs = availableCandidatePCs.filter(pc => APEX_LEGENDS_PCS.includes(pc));
  }

  if (availableCandidatePCs.length < partySize) {
    return []; // Not enough PCs available even before considering adjacency
  }

  if (seatTogether && partySize > 1) {
    const findAdjacentBlockInGroup = (groupArray, requiredSize, availablePCsInGroup) => {
      if (groupArray.length < requiredSize) return null;
      for (let i = 0; i <= groupArray.length - requiredSize; i++) {
        const potentialBlock = groupArray.slice(i, i + requiredSize);
        if (potentialBlock.every(pc => availablePCsInGroup.includes(pc))) {
          return potentialBlock;
        }
      }
      return null;
    };

    let foundBlock = null;

    // Check GROUP_MLKJ (can satisfy partySize 2, 3, 4)
    if (partySize <= 4) {
        foundBlock = findAdjacentBlockInGroup(SEAT_TOPOLOGY.GROUP_MLKJ, partySize, availableCandidatePCs);
        if (foundBlock) return foundBlock;
    }
    // If partySize is 4, it must be MLKJ. If not found, no other group can satisfy.
    if (partySize === 4 && !foundBlock) return []; 

    // Check GROUP_FED (can satisfy partySize 2, 3)
    if (partySize <= 3) {
        foundBlock = findAdjacentBlockInGroup(SEAT_TOPOLOGY.GROUP_FED, partySize, availableCandidatePCs);
        if (foundBlock) return foundBlock;
    }

    // Check GROUP_CBA (can satisfy partySize 2, 3)
    if (partySize <= 3) {
        foundBlock = findAdjacentBlockInGroup(SEAT_TOPOLOGY.GROUP_CBA, partySize, availableCandidatePCs);
        if (foundBlock) return foundBlock;
    }

    // Check GROUP_IHG (can satisfy partySize 2, 3)
    if (partySize <= 3) {
        foundBlock = findAdjacentBlockInGroup(SEAT_TOPOLOGY.GROUP_IHG, partySize, availableCandidatePCs);
        if (foundBlock) return foundBlock;
    }
    
    // If no block found after checking all relevant groups based on partySize
    return []; 

  } else {
    // seatTogether is false or partySize is 1: just return the first N available PCs
    if (availableCandidatePCs.length >= partySize) {
      return availableCandidatePCs.slice(0, partySize);
    }
    return [];
  }
}


app.post("/api/create/reservation", async (req, res) => {
  try {
    console.log("Received reservation request (new algo):", req.body);
    const db = client.db(dbName);
    const {
      name,
      email,
      consoleType, // Still needed for console reservations
      reservationType, // "PC" or "CONSOLE"
      partySize, 
      seatTogether, 
      preferredGame, 
    } = req.body;

    if (!email || !name || !reservationType) {
      return res.status(400).json({ message: "Missing required fields: email, name, or reservationType" });
    }
    // Duplicate check is currently disabled for testing as per user request

    const reservationData = {
      name,
      email,
      reservationType,
      status: "waitlisted", // ALL reservations start as waitlisted
      createdAt: new Date(),
      notes: "",
      assignedPCs: [],
      partySize: reservationType === "PC" ? parseInt(partySize, 10) : 1, // Consoles default to party size 1
      seatTogether: reservationType === "PC" ? !!seatTogether : false, // Consoles default to no seat together
      preferredGame: reservationType === "PC" ? (preferredGame === "ANY" ? null : preferredGame) : null, // Store "Apex Legends" or null
      consoleType: reservationType === "CONSOLE" ? consoleType : null,
      // startTime, endTime will be set upon activation
    };
    
    if (reservationType === "PC") {
        if (!reservationData.partySize || reservationData.partySize < 1 || reservationData.partySize > 4) {
            return res.status(400).json({ message: "Party size must be between 1 and 4 for PC reservations." });
        }
         // preferredGame mapping: "APEX" from frontend to "Apex Legends" for backend
        if (reservationData.preferredGame === "APEX") {
            reservationData.preferredGame = "Apex Legends";
        }

    } else if (reservationType === "CONSOLE") {
        if (!consoleType) {
            return res.status(400).json({ message: "consoleType is required for CONSOLE reservations" });
        }
        // Party size for console is now defaulted to 1 above.
        // seatTogether for console is now defaulted to false above.
    } else {
      return res.status(400).json({ message: "Invalid reservationType." });
    }

    const result = await db.collection("reservations").insertOne(reservationData);
    const createdReservation = { _id: result.insertedId, ...reservationData };
    
    console.log(`Reservation ${createdReservation._id} for ${createdReservation.reservationType} created with status: ${createdReservation.status}`);

    // Trigger allocation cycle for ANY newly waitlisted reservation (PC or Console)
    if (createdReservation.status === "waitlisted") {
      await triggerAllocationCycle(db);
    }

    res.status(201).json({
      message: `Reservation ${createdReservation.status}`,
      reservationId: createdReservation._id,
      reservationDetails: createdReservation,
    });
  } catch (err) {
    console.error("Error creating reservation (new algo):", err);
    res.status(500).send("Internal Server Error");
  }
});

app.put("/api/reservations/complete/:reservationId", async (req, res) => {
  try {
    const db = client.db(dbName);
    const { reservationId } = req.params;

    if (!ObjectId.isValid(reservationId)) {
        return res.status(400).json({ message: "Invalid reservation ID format." });
    }

    const reservation = await db.collection("reservations").findOne({ _id: new ObjectId(reservationId) });
    if (!reservation) {
      return res.status(404).json({ message: "Reservation not found." });
    }
    if (reservation.status === "completed") {
        return res.status(400).json({ message: "Reservation is already completed." });
    }

    const updateResult = await db.collection("reservations").updateOne(
      { _id: new ObjectId(reservationId) },
      { $set: { status: "completed", actualEndTime: new Date() } }
    );

    if (updateResult.modifiedCount === 0) {
        // This can happen if status was already 'completed' or ID not found, though we check above.
        // Or if no actual change to data occurred.
        console.log(`Reservation ${reservationId} complete endpoint: No modification needed or done.`);
    } else {
        console.log(`Reservation ${reservationId} marked as completed.`);
    }
    
    // Trigger allocation cycle regardless of modification count, as the intention is to free resources
    await triggerAllocationCycle(db);

    res.json({ message: "Reservation marked as completed and allocation cycle triggered.", reservationId });
  } catch (err) {
    console.error("Error completing reservation (new algo):", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


app.delete("/api/delete/reservation", async (req, res) => {
  try {
    const db = client.db(dbName);
    const { reservationId, userEmail, userRole } = req.body; 
    
    if (!reservationId || !userEmail || !userRole) {
      return res.status(400).json({ message: "Missing reservationId, userEmail, or userRole for deletion." });
    }
    if (!ObjectId.isValid(reservationId)) {
        return res.status(400).json({ message: "Invalid reservation ID format." });
    }

    const reservationToDelete = await db.collection("reservations").findOne({ _id: new ObjectId(reservationId) });
    if (!reservationToDelete) {
      return res.status(404).json({ message: "Reservation not found" });
    }

    if (userRole !== "ADMIN" && reservationToDelete.email.toLowerCase() !== userEmail.toLowerCase()) {
      return res.status(403).json({ message: "Not authorized to delete this reservation" });
    }

    const deleteResult = await db.collection("reservations").deleteOne({ _id: new ObjectId(reservationId) });

    if (deleteResult.deletedCount === 1) {
        console.log(`Reservation ${reservationId} deleted by ${userEmail}.`);
        // If the deleted reservation was active, it effectively frees up seats.
        if (reservationToDelete.status === "active") {
            await triggerAllocationCycle(db);
        }
        res.json({ message: "Reservation deleted successfully." });
    } else {
        res.status(500).json({ message: "Failed to delete reservation."});
    }
  } catch (err) {
    console.error("Error deleting reservation (new algo):", err);
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
    const db = await connectToDatabase(); // Ensure db is connected
    // Perform a simple findOne query to test the connection
    const adminUser = await db.collection("users").findOne({});
    if (adminUser) {
      console.log("Successfully queried the database. Test document:", adminUser._id);
    } else {
      console.log(
        "Successfully queried the database. No documents found in users collection (this is okay if the collection is new)."
      );
    }
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(`Server with new allocation logic is running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start the server (new algo):", err);
    process.exit(1); // Exit if we can't connect to DB or start server
  }
}

startServer();
