import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "./firebase/AuthContext";

import { Avatar, AvatarIcon } from "@heroui/react";

import { useNavigate }  from "react-router-dom";

// Import bulk dependencies based on need

import {
  Card,
  CardBody,
  HeroUIProvider,
  Divider,
  CardFooter,
  CardHeader,
  Image,
  useDisclosure,
  Select,
  SelectItem
} from "@heroui/react";

import { Chip } from "@heroui/react";

import { Button, ButtonGroup } from "@heroui/button";

import { Spacer } from "@heroui/spacer";

import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/react";

import { Link } from "@heroui/react";

import axios from "axios";


import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

import CustomModal from "./components/CustomModal";

function AppContent() {

  



  const listOfPC = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "Side",
  ];
  const [selectedPC, setSelectedPC] = useState("A");

  const navigate = useNavigate();
  const { currentUser, logout, userRole } = useAuth();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [reservations, setReservations] = useState([]);
  const [selectedConsoleFilter, setSelectedConsoleFilter] = useState("All");
  const consoleFilterOptions = ["All", "SWITCH", "XBOX", "PS5"];

  const fetchReservations = useCallback(() => {
    axios.get("http://localhost:8080/api/view/reservations")
      .then((response) => {
        const sortedData = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setReservations(sortedData);
      })
      .catch((error) => {
        console.error("Error fetching reservations:", error);
        alert("Could not fetch reservations. Please try again later.");
      });
  }, []);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleDeleteReservation = async (reservationId) => {
    if (!currentUser) return;
    try {
      await axios.delete("http://localhost:8080/api/delete/reservation", {
        data: {
          reservationId,
          userEmail: currentUser.email,
          userRole: userRole,
        },
      });
      fetchReservations();
      alert("Reservation deleted successfully.");
    } catch (err) {
      console.error("Error deleting reservation:", err.response ? err.response.data : err.message);
      alert("Failed to delete reservation: " + (err.response && err.response.data && err.response.data.message ? err.response.data.message : "Server error"));
    }
  };

  const handleCompleteReservation = async (reservationId) => {
    if (!currentUser) return;
    try {
      await axios.put(`http://localhost:8080/api/reservations/complete/${reservationId}`, {
        userEmail: currentUser.email,
        userRole: userRole,
      });
      fetchReservations();
      alert("Reservation marked as completed.");
    } catch (err) {
      console.error("Error completing reservation:", err.response ? err.response.data : err.message);
      alert("Failed to complete reservation: " + (err.response && err.response.data && err.response.data.message ? err.response.data.message : "Server error"));
    }
  };

  const pcReservations = reservations.filter(r => r.reservationType === "PC");
  const consoleReservations = reservations.filter(r => r.reservationType === "CONSOLE");

  const activePcReservations = pcReservations.filter(r => r.status === 'active');
  const waitlistedPcReservations = pcReservations.filter(r => r.status === 'waitlisted').sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Calculate the number of actually occupied PC stations
  const occupiedPcCount = activePcReservations.reduce((sum, currentReservation) => {
    return sum + (currentReservation.partySize || 0); // Add partySize, default to 0 if undefined
  }, 0);

  const activeConsoleSessions = consoleReservations.filter(r => r.status === 'active');
  const waitlistedConsoleSessions = consoleReservations.filter(r => r.status === 'waitlisted').sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

  const filteredActiveConsoleSessions = activeConsoleSessions.filter(
    (item) => selectedConsoleFilter === "All" || item.consoleType === selectedConsoleFilter
  );

  const getFirstName = (displayName) => {
    if (!displayName) return '';
    return displayName.split(' ')[0];
  };

  return (
    <>
      <HeroUIProvider>
        <nav className="w-full flex items-center justify-between p-4 bg-gray-100 shadow-md">
          <div className="text-2xl font-bold text-indigo-600">
            Eclipse Gaming Lounge
          </div>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <span className="text-gray-700">
                  {userRole === 'ADMIN'
                    ? 'Welcome, Admin!'
                    : `Welcome, ${getFirstName(currentUser.displayName)}!`}
                </span>
                <Button onPress={onOpen} color="primary" variant="solid">
                  New Reservation
                </Button>
                <Button
                  color="danger"
                  variant="ghost"
                  onPress={logout}
                >
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button as={Link} href="/signup" color="secondary" variant="solid">
                  Sign Up
                </Button>
                <Button as={Link} href="/login" color="primary" variant="solid">
                  Log In
                </Button>
              </>
            )}
          </div>
        </nav>
        
        <CustomModal 
            isOpen={isOpen} 
            onOpenChange={onOpenChange} 
            onReservationCreated={fetchReservations} 
        />

        <div className="w-full p-4 flex flex-row gap-6">
          {/* PC Reservations Section (Column 1) */}
          <div className="flex-1 bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-3 text-indigo-700">PC Stations</h2>
            <div className="mb-4">
                 <Chip color="success" size="md">Active PCs: {occupiedPcCount} / {14}</Chip>
                 <Chip color="warning" size="md" className="ml-2">PC Waitlist: {waitlistedPcReservations.length}</Chip>
            </div>

            <h3 className="text-lg font-medium mb-2 text-gray-800">Active PC Sessions</h3>
            {activePcReservations.length === 0 && <p className="text-gray-600">No active PC sessions.</p>}
            {activePcReservations.map((item) => (
              <Card key={item._id} className="mb-3 shadow-md">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-md">{item.name} ({item.email})</p>
                      <p className="text-sm text-gray-600">Party Size: {item.partySize}</p>
                      <p className="text-sm text-gray-600">Seat Together: {item.seatTogether ? "Yes" : "No"}</p>
                      <p className="text-sm text-gray-600">Game: {item.preferredGame || "Any"}</p>
                      <p className="text-sm text-gray-600">Assigned: {item.assignedPCs && item.assignedPCs.length > 0 ? item.assignedPCs.join(', ') : "Pending assignment"}</p>
                      <p className="text-sm text-green-600 font-medium">Ends: {item.endTime ? new Date(item.endTime).toLocaleTimeString() : "N/A"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {(userRole === 'ADMIN' || (currentUser && currentUser.email === item.email)) && (
                            <Button size="sm" color="warning" variant="flat" onPress={() => handleCompleteReservation(item._id)}>Complete</Button>
                        )}
                        {(userRole === 'ADMIN' || (currentUser && currentUser.email === item.email)) && (
                            <Button size="sm" color="danger" variant="ghost" onPress={() => handleDeleteReservation(item._id)}>Delete</Button>
                        )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}

            <h3 className="text-lg font-medium mt-6 mb-2 text-gray-800">PC Waitlist</h3>
            {waitlistedPcReservations.length === 0 && <p className="text-gray-600">PC waitlist is empty.</p>}
            {waitlistedPcReservations.map((item, index) => (
              <Card key={item._id} className="mb-3 shadow-md bg-gray-50">
                <CardBody>
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-semibold text-md">#{index + 1}: {item.name} ({item.email})</p>
                        <p className="text-sm text-gray-600">Party Size: {item.partySize}</p>
                        <p className="text-sm text-gray-600">Seat Together: {item.seatTogether ? "Yes" : "No"}</p>
                        <p className="text-sm text-gray-600">Game: {item.preferredGame || "Any"}</p>
                        <p className="text-sm text-gray-600">Status: <Chip size="sm" color="default">{item.status}</Chip></p>
                        <p className="text-xs text-gray-500">Queued at: {new Date(item.createdAt).toLocaleTimeString()}</p>
                        {item.notes && <p className="text-xs text-orange-500">Notes: {item.notes}</p>}
                    </div>
                     {(userRole === 'ADMIN' || (currentUser && currentUser.email === item.email)) && (
                        <Button size="sm" color="danger" variant="ghost" onPress={() => handleDeleteReservation(item._id)}>Cancel</Button>
                     )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Console Reservations Section (Column 2) */}
          <div className="flex-1 bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold text-indigo-700">Console Gaming</h2>
              <Select 
                labelPlacement="outside-left"
                placeholder="Filter by console"
                selectedKeys={[selectedConsoleFilter]}
                onSelectionChange={(keys) => setSelectedConsoleFilter(Array.from(keys)[0] || "All")}
                className="w-48"
              >
                {consoleFilterOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </Select>
            </div>
            <div className="mb-4">
                 <Chip color="success" size="md">Active Consoles: {activeConsoleSessions.length} / 2</Chip>
                 <Chip color="warning" size="md" className="ml-2">Console Waitlist: {waitlistedConsoleSessions.length}</Chip>
            </div>

            <h3 className="text-lg font-medium mb-2 text-gray-800">Active Console Sessions</h3>
            {filteredActiveConsoleSessions.length === 0 && <p className="text-gray-600">No active console sessions matching filter.</p>}
            {filteredActiveConsoleSessions.map((item) => (
              <Card key={item._id} className="mb-3 shadow-md">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-md">{item.name} ({item.email})</p>
                      <p className="text-sm text-gray-600">Console: {item.consoleType}</p>
                      <p className="text-sm text-green-600 font-medium">Ends: {item.endTime ? new Date(item.endTime).toLocaleTimeString() : "N/A"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {(userRole === 'ADMIN' || (currentUser && currentUser.email === item.email)) && (
                            <Button size="sm" color="warning" variant="flat" onPress={() => handleCompleteReservation(item._id)}>Complete</Button>
                        )}
                        {(userRole === 'ADMIN' || (currentUser && currentUser.email === item.email)) && (
                            <Button size="sm" color="danger" variant="ghost" onPress={() => handleDeleteReservation(item._id)}>Delete</Button>
                        )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}

            <h3 className="text-lg font-medium mt-6 mb-2 text-gray-800">Console Waitlist</h3>
            {waitlistedConsoleSessions.length === 0 && <p className="text-gray-600">Console waitlist is empty.</p>}
            {waitlistedConsoleSessions.map((item, index) => (
              <Card key={item._id} className="mb-3 shadow-md bg-gray-50">
                <CardBody>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-md">#{index + 1}: {item.name} ({item.email})</p>
                      <p className="text-sm text-gray-600">Console: {item.consoleType}</p>
                      <p className="text-sm text-gray-600">Status: <Chip size="sm" color="default">{item.status}</Chip></p>
                      <p className="text-xs text-gray-500">Queued at: {new Date(item.createdAt).toLocaleTimeString()}</p>
                      {item.notes && <p className="text-xs text-orange-500">Notes: {item.notes}</p>}
                    </div>
                    {(userRole === 'ADMIN' || (currentUser && currentUser.email === item.email)) && (
                      <Button size="sm" color="danger" variant="ghost" onPress={() => handleDeleteReservation(item._id)}>Cancel</Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </HeroUIProvider>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
