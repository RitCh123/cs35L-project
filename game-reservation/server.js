const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const nodemailer = require("nodemailer");
const { sendQueueNotification, sendWaitlistConfirmationEmail, sendReservationActiveEmail } = require('./src/utils/emailService'); // Ensure this path is correct

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Connection URI
const uri = `mongodb+srv://nks676:${process.env.DB_PASSWORD}@eggert.a6kxlho.mongodb.net/?retryWrites=true&w=majority&appName=Eggert`;

// Create a new MongoClient
const client = new MongoClient(uri);

// Database Name
const dbName = "eclipse_gaming";

const adminEmails = ["rchavali@g.ucla.edu", "nks676@g.ucla.edu", "nikhildewitt@g.ucla.edu"];

// Nodemailer transporter setup (using environment variables)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
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
  console.log("[AllocationCycle] Trying to allocate ADJACENT PC parties.");
  const seatState = await getSeatState(db);
  const freeBlocks = refreshFreeBlocks(seatState, SEAT_TOPOLOGY);
  const Q_adj_candidates = await db.collection("reservations").find({
    status: "waitlisted", reservationType: "PC", seatTogether: true 
  }).sort({ createdAt: 1 }).limit(ADJ_QUEUE_WINDOW).toArray();

  if (Q_adj_candidates.length === 0) {
    console.log("[AllocationCycle] No adjacent PC candidates in waitlist.");
    return false;
  }

  const sortedCandidates = Q_adj_candidates.sort((a, b) => {
    if (a.partySize !== b.partySize) return b.partySize - a.partySize; // Prioritize larger parties
    return new Date(a.createdAt) - new Date(b.createdAt); // Then by oldest
  });

  for (const party of sortedCandidates) {
    console.log(`[AllocationCycle] Evaluating adjacent candidate: ${party._id} (Name: ${party.name}, Size: ${party.partySize})`);
    const blockSegment = findBestFitBlockForAdjacent(party, freeBlocks);
    if (blockSegment) {
      console.log(`[AllocationCycle] Found suitable block ${blockSegment.join(',')} for adjacent party ${party._id}.`);
      await updateReservationToActive(db, party._id, blockSegment, "Promoted (adjacent) from waitlist.");
      console.log(`[AllocationCycle] Adjacent party ${party._id} (${party.name}, size ${party.partySize}) seated in ${blockSegment.join(',')}.`);
      
      // Send email notification
      if (party.email) {
        console.log(`[AllocationCycle] Sending 'active' email to ${party.email} for PC reservation ${party._id}.`);
        sendReservationActiveEmail(party.email, party.reservationType, party.name, blockSegment)
          .catch(err => console.error(`[AllocationCycle] Error sending 'active' email for adjacent party ${party._id}:`, err));
      }
      return true; // Allocation made
    }
  }
  console.log("[AllocationCycle] No suitable blocks found for any current adjacent PC candidates.");
  return false;
}

async function allocateFlexibleParties(db) {
  console.log("[AllocationCycle] Trying to allocate FLEXIBLE PC parties.");
  const seatState = await getSeatState(db);
  let availableSingleSeats = ALL_REAL_SEATS.filter(seatId => seatState[seatId] === null);
  const Q_flex = await db.collection("reservations").find({
    status: "waitlisted", reservationType: "PC", seatTogether: false
  }).sort({ createdAt: 1 }).toArray();

  if (Q_flex.length === 0) {
    console.log("[AllocationCycle] No flexible PC candidates in waitlist.");
    return false;
  }
  console.log(`[AllocationCycle] Found ${Q_flex.length} flexible PC candidates.`);

  let anAllocationMade = false;
  for (const party of Q_flex) {
    console.log(`[AllocationCycle] Evaluating flexible candidate: ${party._id} (Name: ${party.name}, Size: ${party.partySize})`);
    let partySpecificAvailableSeats = availableSingleSeats;
    if (party.preferredGame === "Apex Legends") {
      partySpecificAvailableSeats = availableSingleSeats.filter(seatId => APEX_LEGENDS_PCS.includes(seatId));
    }

    if (partySpecificAvailableSeats.length >= party.partySize) {
      const seatsToAssign = partySpecificAvailableSeats.slice(0, party.partySize);
      console.log(`[AllocationCycle] Found suitable seats ${seatsToAssign.join(',')} for flexible party ${party._id}.`);
      await updateReservationToActive(db, party._id, seatsToAssign, "Promoted (flexible) from waitlist.");
      console.log(`[AllocationCycle] Flexible party ${party._id} (${party.name}, size ${party.partySize}) seated in ${seatsToAssign.join(',')}.`);
      
      // Send email notification
      if (party.email) {
        console.log(`[AllocationCycle] Sending 'active' email to ${party.email} for PC reservation ${party._id}.`);
        sendReservationActiveEmail(party.email, party.reservationType, party.name, seatsToAssign)
          .catch(err => console.error(`[AllocationCycle] Error sending 'active' email for flexible party ${party._id}:`, err));
      }

      // Update available seats for the next iteration in this pass
      seatsToAssign.forEach(assignedSeat => { 
        availableSingleSeats = availableSingleSeats.filter(s => s !== assignedSeat); 
      });
      anAllocationMade = true;
    } else {
      console.log(`[AllocationCycle] Not enough available seats for flexible party ${party._id} (needs ${party.partySize}, available relevant: ${partySpecificAvailableSeats.length}).`);
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
  console.log("[AllocationCycle] Trying to allocate CONSOLE parties.");
  const activeConsoleSlots = await getActiveConsoleSlotCount(db);
  const availableSlots = TOTAL_CONSOLE_SLOTS - activeConsoleSlots;
  console.log(`[AllocationCycle] Active console slots: ${activeConsoleSlots}, Total slots: ${TOTAL_CONSOLE_SLOTS}, Available: ${availableSlots}`);

  if (availableSlots <= 0) {
    console.log("[AllocationCycle] No console slots available.");
    return false; 
  }

  // Fetch one candidate at a time to fill available slots
  const Q_consoles = await db.collection("reservations").find({
    status: "waitlisted",
    reservationType: "CONSOLE"
  }).sort({ createdAt: 1 }).limit(1).toArray(); // Get the oldest one

  if (Q_consoles.length === 0) {
    console.log("[AllocationCycle] No console candidates in waitlist.");
    return false; 
  }

  const partyToSeat = Q_consoles[0];
  console.log(`[AllocationCycle] Evaluating console candidate: ${partyToSeat._id} (Name: ${partyToSeat.name}, Type: ${partyToSeat.consoleType})`);
  
  // For consoles, assignedPCs is not used for specific seat IDs. We just activate them.
  await updateReservationToActive(db, partyToSeat._id, [], `Promoted (console) from waitlist for ${partyToSeat.consoleType}.`);
  console.log(`[AllocationCycle] Console party ${partyToSeat._id} (${partyToSeat.name}, type ${partyToSeat.consoleType}) seated.`);
  
  // Send email notification
  if (partyToSeat.email) {
    console.log(`[AllocationCycle] Sending 'active' email to ${partyToSeat.email} for CONSOLE reservation ${partyToSeat._id}.`);
    // For consoles, the 'assignedDetails' parameter is the consoleType
    sendReservationActiveEmail(partyToSeat.email, partyToSeat.reservationType, partyToSeat.name, partyToSeat.consoleType)
      .catch(err => console.error(`[AllocationCycle] Error sending 'active' email for console party ${partyToSeat._id}:`, err));
  }
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
    await db.createCollection("profiles");
    
    // Create friend_requests collection and indexes
    const friendRequestsCollection = db.collection("friend_requests");
    await friendRequestsCollection.createIndex({ recipient: 1, status: 1 });
    await friendRequestsCollection.createIndex({ sender: 1, status: 1 });
    await friendRequestsCollection.createIndex({ createdAt: 1 });

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

app.post("/api/create/user", async (req, res) => {
  try {
    console.log("Received user creation request:", req.body);
    const db = client.db(dbName);
    let { email: rawEmail } = req.body; // Role will be determined by adminEmails

    if (!rawEmail || typeof rawEmail !== 'string') {
      return res.status(400).json({ message: "Email is required and must be a string." });
    }
    const email = rawEmail.toLowerCase().trim(); // Normalize email to lowercase and trim whitespace

    // Check if user already exists with the normalized email
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      console.log(`User ${email} already exists. Role: ${existingUser.role}`);
      return res.status(200).json({ message: "User already exists", userId: existingUser._id, role: existingUser.role });
    }
    
    // If user does not exist, create a new one with the normalized email
    const newUser = {
      email, // Use the normalized (lowercase, trimmed) email
      role: adminEmails.includes(email) ? "ADMIN" : "USER", // Check role against normalized email if adminEmails are also normalized
      createdAt: new Date(),
    };
    const result = await db.collection("users").insertOne(newUser);
    console.log(`User ${email} created with ID: ${result.insertedId} and Role: ${newUser.role}`);
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
    console.log("[Reservation Create] --- New Reservation Request Start ---");
    console.log("[Reservation Create] Request Body:", JSON.stringify(req.body, null, 2));

    const db = client.db(dbName);
    const {
      name,
      email, // Email of the person making the reservation
      consoleType,
      reservationType,
      partySize: partySizeStr,
      seatTogether, 
      preferredGame,
      partyMembers // Add this to destructure partyMembers from request body
    } = req.body;

    if (!email || !name || !reservationType) {
      console.error("[Reservation Create] Validation Error: Missing required fields: email, name, or reservationType");
      return res.status(400).json({ message: "Missing required fields: email, name, or reservationType" });
    }

    const partySize = reservationType === "PC" ? parseInt(partySizeStr, 10) : 1;

    console.log(`[Reservation Create] Parsed Party Size: ${partySize}`);
    console.log(`[Reservation Create] Requester Email: ${email}`);

    // Validate that partyMembers includes the current user's email
    if (partyMembers && !partyMembers.includes(email)) {
      console.error("[Reservation Create] Validation Error: partyMembers must include the current user's email");
      return res.status(400).json({ message: "partyMembers must include the current user's email" });
    }

    const reservationData = {
      name,
      email,
      reservationType,
      status: "waitlisted",
      createdAt: new Date(),
      notes: "",
      assignedPCs: [],
      partySize,
      seatTogether: reservationType === "PC" ? !!seatTogether : false,
      preferredGame: reservationType === "PC" ? (preferredGame === "ANY" ? null : preferredGame) : null,
      consoleType: reservationType === "CONSOLE" ? consoleType : null,
      partyMembers: partyMembers || [email], // Use partyMembers from request if provided, otherwise default to just the current user
    };
    
    if (reservationType === "PC") {
        if (!reservationData.partySize || reservationData.partySize < 1 || reservationData.partySize > 4) {
            console.error(`[Reservation Create] Validation Error: Party size ${reservationData.partySize} out of range (1-4).`);
            return res.status(400).json({ message: "Party size must be between 1 and 4 for PC reservations." });
        }
        if (reservationData.preferredGame === "APEX") {
            reservationData.preferredGame = "Apex Legends";
        }
        console.log("[Reservation Create] PC Reservation. Party member email validation logic as per existing code.");

    } else if (reservationType === "CONSOLE") {
        if (!consoleType) {
            console.error("[Reservation Create] Validation Error: consoleType is required for CONSOLE reservations.");
            return res.status(400).json({ message: "consoleType is required for CONSOLE reservations" });
        }
        console.log("[Reservation Create] Console reservation, party members set to requester only.");
    } else {
      console.error(`[Reservation Create] Validation Error: Invalid reservationType: ${reservationType}.`);
      return res.status(400).json({ message: "Invalid reservationType." });
    }

    console.log("[Reservation Create] Final reservationData before insert:", JSON.stringify(reservationData, null, 2));
    const result = await db.collection("reservations").insertOne(reservationData);
    const initialReservation = { _id: result.insertedId, ...reservationData }; // Capture initial state

    console.log(`[Reservation Create] Reservation ${initialReservation._id} for ${initialReservation.reservationType} created with initial status: ${initialReservation.status}`);

    // Trigger allocation cycle immediately after creating the waitlisted reservation
    console.log("[Reservation Create] Triggering allocation cycle...");
    await triggerAllocationCycle(db);
    console.log("[Reservation Create] Allocation cycle finished.");

    // Re-fetch the reservation to check its current status after allocation cycle
    const finalReservation = await db.collection("reservations").findOne({ _id: initialReservation._id });

    if (!finalReservation) {
        console.error(`[Reservation Create] CRITICAL: Reservation ${initialReservation._id} not found after allocation cycle.`);
        // This shouldn't happen if insert was successful. Send original details.
        return res.status(201).json({
            message: `Reservation ${initialReservation.status} (Error fetching final status)`, // Potentially misleading, but better than crashing
            reservationId: initialReservation._id,
            reservationDetails: initialReservation,
        });
    }

    console.log(`[Reservation Create] Final status for reservation ${finalReservation._id} is: ${finalReservation.status}`);

    // Send waitlist confirmation email ONLY if still waitlisted
    if (finalReservation.status === "waitlisted") {
      console.log(`[Reservation Create] Reservation ${finalReservation._id} is still waitlisted. Sending confirmation email to ${finalReservation.email}.`);
      try {
        await sendWaitlistConfirmationEmail(finalReservation.email, finalReservation.reservationType, finalReservation.name);
      } catch (emailError) {
        console.error(`[Reservation Create] Failed to send waitlist confirmation email for ${finalReservation._id}: `, emailError);
        // Do not let email failure break the reservation flow
      }
    }

    console.log("[Reservation Create] --- Reservation Request End ---");

    res.status(201).json({
      message: `Reservation status: ${finalReservation.status}`, // Provide the final status
      reservationId: finalReservation._id,
      reservationDetails: finalReservation,
      });
  } catch (err) {
    console.error("[Reservation Create] !!! Critical Error in /api/create/reservation !!!:", err);
    if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
        return res.status(503).json({ message: 'Database communication error. Please try again later.' });
    }
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

// Deprecating /api/move/pc/reservation and /api/move/console/reservation
// The new system assigns PCs/consoles at creation or promotes from waitlist.
// Direct "moving" by user is not part of this new model. Admins could manually update if needed.

// Start Added Profile Endpoints
app.get("/api/view/profiles", async (req, res) => {
  try {
    const db = client.db(dbName);
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

app.post("/api/create/profile", async (req, res) => {
  try {
    console.log("Received request for profile creation:", req.body);
    const db = client.db(dbName);
    const { name, email, game, mode, time, playStyle } = req.body;

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
      playStyle,
      openToFriends: false,
      createdAt: new Date(),
    };

    const result = await db.collection("profiles").insertOne(profile);
    res.status(201).json({
      message: "Profile created",
      profileId: result.insertedId,
      profileData: profile 
    });
  } catch (err) {
    console.error("Error creating profile:", err);
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

    // Reverted: interestedGames, modes, availability, playStyle removed from allowedFields
    const allowedFields = ["name", "game", "mode", "time", "playStyle"];
    const update = {};
    for (const key of allowedFields) {
      if (fieldsToUpdate[key] !== undefined) {
        update[key] = fieldsToUpdate[key];
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update based on allowed list." });
    }

    // Upsert is kept as it was part of the change for the new fields, but it's generally fine to keep.
    // If you want to strictly revert to only updating existing, change upsert to false.
    const result = await db.collection("profiles").updateOne(
      { email },
      { $set: update },
      { upsert: true } 
    );

    const updatedProfile = await db.collection("profiles").findOne({ email });

    res.json({ 
      message: "Profile updated successfully",
      updatedFields: update,
      profileData: updatedProfile
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Internal Server Error");
  }
});
// End Added Profile Endpoints

// Start Added Friend Request Endpoints
app.post('/api/friends/add', async (req, res) => {
  const { requestorEmail, friendProfileId } = req.body;
  console.log(`Friend add request from ${requestorEmail} for profile ID ${friendProfileId}`);
  
  try {
    const db = client.db(dbName);
    let recipientEmail;

    // Handle dummy profile case
    if (friendProfileId === "dummy-nikhil") {
      recipientEmail = "nikhildewitt@g.ucla.edu";
    } else {
      // Get recipient's email from their profile
      const friendProfile = await db.collection("profiles").findOne({ 
        _id: new ObjectId(friendProfileId) 
      });
      
      if (!friendProfile) {
        return res.status(404).json({ message: 'Friend profile not found' });
      }
      recipientEmail = friendProfile.email;
    }

    // Check if a pending request already exists
    const existingRequest = await db.collection("friend_requests").findOne({
      sender: requestorEmail,
      recipient: recipientEmail,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Create the friend request in the new collection
    const friendRequest = {
      sender: requestorEmail,
      recipient: recipientEmail,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection("friend_requests").insertOne(friendRequest);

    res.status(200).json({ 
      message: 'Friend request sent successfully',
      request: { ...friendRequest, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error processing friend request:', error);
    res.status(500).json({ 
      message: 'Error processing friend request',
      error: error.message 
    });
  }
});

// Add new endpoint to get pending friend requests
app.get('/api/friends/requests', async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const db = client.db(dbName);
    const requests = await db.collection("friend_requests")
      .find({ 
        recipient: email,
        status: "pending"
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ 
      message: 'Error fetching friend requests',
      error: error.message 
    });
  }
});


// Add endpoints for accepting/rejecting friend requests
app.post('/api/friends/accept/:requestId', async (req, res) => {
  try {
    const db = client.db(dbName);
    const { requestId } = req.params;
    const { userEmail } = req.body; // To verify the user is the recipient

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }

    // Find and update the request
    const request = await db.collection("friend_requests").findOne({
      _id: new ObjectId(requestId),
      recipient: userEmail,
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found or already processed' });
    }

    // Update the request status
    await db.collection("friend_requests").updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          status: "accepted",
          updatedAt: new Date()
        }
      }
    );

    // Send email notification
    const subject = 'Friend Request Accepted';
    const text = `${userEmail} has accepted your friend request on Eclipse Gaming!`;
    await sendEmail(request.sender, subject, text);

    res.status(200).json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ 
      message: 'Error accepting friend request',
      error: error.message 
    });
  }
});

app.post('/api/friends/reject/:requestId', async (req, res) => {
  try {
    const db = client.db(dbName);
    const { requestId } = req.params;
    const { userEmail } = req.body; // To verify the user is the recipient

    if (!ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }

    // Find and update the request
    const request = await db.collection("friend_requests").findOne({
      _id: new ObjectId(requestId),
      recipient: userEmail,
      status: "pending"
    });

    if (!request) {
      return res.status(404).json({ message: 'Friend request not found or already processed' });
    }

    // Update the request status
    await db.collection("friend_requests").updateOne(
      { _id: new ObjectId(requestId) },
      { 
        $set: { 
          status: "rejected",
          updatedAt: new Date()
        }
      }
    );

    // Send email notification
    const subject = 'Friend Request Rejected';
    const text = `${userEmail} has declined your friend request on Eclipse Gaming.`;
    await sendEmail(request.sender, subject, text);

    res.status(200).json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ 
      message: 'Error rejecting friend request',
      error: error.message 
    });
  }
});

// Add endpoint to get accepted friends
app.get('/api/friends/accepted', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const db = client.db(dbName);
    
    // Find all accepted friend requests where the user is either sender or recipient
    const acceptedRequests = await db.collection("friend_requests")
      .find({
        $or: [
          { sender: email, status: "accepted" },
          { recipient: email, status: "accepted" }
        ]
      })
      .toArray();

    // Transform the data to get friend emails
    const friends = acceptedRequests.map(request => {
      // If user was the sender, return recipient's email, otherwise return sender's email
      return request.sender === email ? request.recipient : request.sender;
    });

    // Get profile information for each friend
    const friendProfiles = await db.collection("profiles")
      .find({ email: { $in: friends } })
      .toArray();

    // Create a map of email to profile for easy lookup
    const profileMap = friendProfiles.reduce((map, profile) => {
      map[profile.email] = profile;
      return map;
    }, {});

    // Combine friend emails with their profile data
    const friendsWithProfiles = friends.map(friendEmail => ({
      email: friendEmail,
      profile: profileMap[friendEmail] || null // Include null if no profile exists
    }));

    res.status(200).json({
      friends: friendsWithProfiles,
      count: friends.length
    });
  } catch (error) {
    console.error('Error fetching accepted friends:', error);
    res.status(500).json({ 
      message: 'Error fetching accepted friends',
      error: error.message 
    });
  }
});

// Add endpoint to get sent friend requests
app.get('/api/friends/sent', async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const db = client.db(dbName);
    const requests = await db.collection("friend_requests")
      .find({ 
        sender: email,
        status: "pending"
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Get profile information for each recipient
    const recipientEmails = requests.map(req => req.recipient);
    const profiles = await db.collection("profiles")
      .find({ email: { $in: recipientEmails } })
      .toArray();

    // Create a map of email to profile for easy lookup
    const profileMap = profiles.reduce((map, profile) => {
      map[profile.email] = profile;
      return map;
    }, {});

    // Add profile information to each request
    const requestsWithProfiles = requests.map(request => ({
      ...request,
      recipientProfile: profileMap[request.recipient] || null
    }));

    res.status(200).json(requestsWithProfiles);
  } catch (error) {
    console.error('Error fetching sent friend requests:', error);
    res.status(500).json({ 
      message: 'Error fetching sent friend requests',
      error: error.message 
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "UP", message: "Server is healthy" });
});

async function cleanupExpiredReservations(db) {
  try {
    const now = new Date();
    // Find and delete all reservations that have passed their end time
    const result = await db.collection("reservations").deleteMany({
      status: "active",
      endTime: { $lt: now }
    });
    
    if (result.deletedCount > 0) {
      console.log(`Cleaned up ${result.deletedCount} expired reservations`);
      // Trigger allocation cycle to fill newly available spots
      await triggerAllocationCycle(db);
    }
  } catch (err) {
    console.error("Error during reservation cleanup:", err);
  }
}
// Update the queue update endpoint
app.post('/api/queue/update', async (req, res) => {
  console.log(`[Queue Update] Received request: ${JSON.stringify(req.body)}`);
  try {
    const { stationId, userId, action } = req.body;
    console.log(`[Queue Update] Action: ${action}, StationID: ${stationId}, UserID: ${userId}`);
    const db = client.db(dbName);

    if (!ObjectId.isValid(stationId) || !ObjectId.isValid(userId)) {
      console.error('[Queue Update] Invalid stationId or userId format.');
      return res.status(400).json({ message: 'Invalid stationId or userId format.' });
    }

    const stationObjectId = new ObjectId(stationId);
    const userObjectId = new ObjectId(userId);

    console.log(`[Queue Update] Fetching station: ${stationObjectId}`);
    const station = await db.collection("stations").findOne({ _id: stationObjectId });
    if (!station) {
      console.error(`[Queue Update] Station not found: ${stationObjectId}`);
      return res.status(404).json({ message: 'Station not found' });
    }
    console.log(`[Queue Update] Found station: ${station.name}`);

    console.log(`[Queue Update] Fetching user: ${userObjectId}`);
    const user = await db.collection("users").findOne({ _id: userObjectId });
    if (!user || !user.email) {
      console.error(`[Queue Update] User not found or no email: ${userObjectId}`);
      return res.status(404).json({ message: 'User not found or user has no email address for notifications.' });
    }
    console.log(`[Queue Update] Found user: ${user.email}`);

    let updatedStation;

    if (action === 'join') {
      console.log(`[Queue Update] Join action for user ${user.email} to station ${station.name}`);
      const currentQueue = station.queue || [];
      const userAlreadyInQueue = currentQueue.some(id => id.equals(userObjectId));

      if (userAlreadyInQueue) {
        updatedStation = await db.collection("stations").findOne({ _id: stationObjectId });
        const userPosition = updatedStation.queue.findIndex(id => id.equals(userObjectId)) + 1;
        console.log(`[Queue Update] User ${user.email} already in queue at position ${userPosition}`);
        return res.status(400).json({ message: 'User is already in this queue.', station: updatedStation, position: userPosition });
      }

      await db.collection("stations").updateOne(
        { _id: stationObjectId },
        { $push: { queue: userObjectId } }
      );
      console.log(`[Queue Update] User ${user.email} added to queue for station ${station.name}`);

      updatedStation = await db.collection("stations").findOne({ _id: stationObjectId });
      const userPosition = updatedStation.queue.findIndex(id => id.equals(userObjectId)) + 1;
      console.log(`[Queue Update] User ${user.email} new position in queue: ${userPosition}`);

      if (userPosition > 0) {
        console.log(`[Queue Update] Attempting to send 'join queue' email to ${user.email} for station ${station.name}, position ${userPosition}`);
        try {
          await sendQueueNotification(user.email, station.name, userPosition);
          console.log(`[Queue Update] 'Join queue' email notification call for ${user.email} completed.`);
        } catch (emailError) {
          console.error(`[Queue Update] Error calling sendQueueNotification for join: `, emailError);
        }
      }
      res.json({ message: 'Joined queue successfully', station: updatedStation, position: userPosition });

    } else if (action === 'leave') {
      console.log(`[Queue Update] Leave action for user ${user.email} from station ${station.name}`);
      const result = await db.collection("stations").updateOne(
        { _id: stationObjectId },
        { $pull: { queue: userObjectId } }
      );

      if (result.modifiedCount === 0) {
        updatedStation = await db.collection("stations").findOne({ _id: stationObjectId });
        console.log(`[Queue Update] User ${user.email} not found in queue or no change made during leave.`);
        return res.status(400).json({ message: 'User not found in queue or no change made.', station: updatedStation });
      }
      console.log(`[Queue Update] User ${user.email} removed from queue for station ${station.name}`);

      updatedStation = await db.collection("stations").findOne({ _id: stationObjectId });

      if (updatedStation.queue && updatedStation.queue.length > 0) {
        const nextUserObjectId = updatedStation.queue[0];
        console.log(`[Queue Update] Next user in queue is ${nextUserObjectId}`);
        const nextUser = await db.collection("users").findOne({ _id: nextUserObjectId });
        if (nextUser && nextUser.email) {
          console.log(`[Queue Update] Attempting to send 'next in queue' email to ${nextUser.email} for station ${station.name}`);
          try {
            await sendQueueNotification(nextUser.email, station.name, 1);
            console.log(`[Queue Update] 'Next in queue' email notification call for ${nextUser.email} completed.`);
          } catch (emailError) {
            console.error(`[Queue Update] Error calling sendQueueNotification for leave/next: `, emailError);
          }
        }
      }
      res.json({ message: 'Left queue successfully', station: updatedStation });

    } else {
      console.error(`[Queue Update] Invalid action: ${action}`);
      res.status(400).json({ message: 'Invalid action specified. Use "join" or "leave".' });
    }
  } catch (error) {
    console.error('[Queue Update] Critical error in /api/queue/update:', error);
    if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
        return res.status(503).json({ message: 'Database communication error. Please try again later.' });
    }
    res.status(500).json({ message: 'Internal server error while updating queue.' });
  }
});

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

    // Set up periodic cleanup every minute
    setInterval(() => cleanupExpiredReservations(db), 60000);
    console.log("Automatic reservation cleanup scheduled");

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
