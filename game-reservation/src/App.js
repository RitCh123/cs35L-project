import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "./firebase/AuthContext";
import { useNavigate, Link as RouterLink }  from "react-router-dom";

// Reverted HeroUI component imports to mostly use @heroui/react
import {
  Avatar,
  AvatarIcon,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  HeroUIProvider,
  Divider,
  Image,
  useDisclosure,
  Select,
  SelectItem,
  Chip,
  Spacer,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem
} from "@heroui/react";

import { Button, ButtonGroup } from "@heroui/button"; // This was already individual
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table"; // This was already individual

import axios from "axios";

import CustomModal from "./components/CustomModal";
import FriendModal from "./components/FriendModal"; // Import remains
import ProfileTable from "./components/ProfileTable"; // Import remains
import DisplayTypeStation from "./components/DisplayTypeStation"; // New import

function AppContent() {
  const listOfPC = [
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "Side",
  ];
  // selectedPC state seems unused, can be reviewed later if needed.
  // const [selectedPC, setSelectedPC] = useState("A");

  const navigate = useNavigate();
  const { currentUser, logout, userRole } = useAuth();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [reservations, setReservations] = useState([]);

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

    // Find the reservation to check ownership
    const reservation = reservations.find(r => r._id === reservationId);
    if (!reservation) {
      alert("Reservation not found.");
      return;
    }

    // Check if user has permission to delete (admin or owner)
    if (userRole !== 'ADMIN' && currentUser.email !== reservation.email) {
      alert("You don't have permission to delete this reservation.");
      return;
    }

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
    
    // Only admins can complete reservations
    if (userRole !== 'ADMIN') {
      alert("Only administrators can complete reservations.");
      return;
    }

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

  const occupiedPcCount = activePcReservations.reduce((sum, currentReservation) => {
    return sum + (currentReservation.partySize || 0);
  }, 0);

  const activeConsoleSessions = consoleReservations.filter(r => r.status === 'active');
  const waitlistedConsoleSessions = consoleReservations.filter(r => r.status === 'waitlisted').sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));

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
                <Button as={RouterLink} to="/friends" color="secondary" variant="ghost">
                  Friends
                </Button>
                {/* Profile button removed */}
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
                <Button as={RouterLink} to="/signup" color="secondary" variant="solid">
                  Sign Up
                </Button>
                <Button as={RouterLink} to="/login" color="primary" variant="solid">
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
        {/* FriendModal and ProfileTable are imported but not directly used in JSX here. */}

        <div style={{ width: '100%', padding: '2rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            gap: '2rem',
            maxWidth: '1800px',
            margin: '0 auto'
          }}>
            <div style={{ flex: 1, maxWidth: '48%' }}>
              <DisplayTypeStation
                title="PC Stations"
                activeCount={occupiedPcCount}
                maxCount={listOfPC.length}
                waitlistCount={waitlistedPcReservations.length}
                activeReservations={activePcReservations}
                waitlistedReservations={waitlistedPcReservations}
                userRole={userRole}
                currentUser={currentUser}
                onComplete={handleCompleteReservation}
                onDelete={handleDeleteReservation}
                stationType="PC"
              />
            </div>

            <div style={{ flex: 1, maxWidth: '48%' }}>
              <DisplayTypeStation
                title="Console Gaming"
                activeCount={activeConsoleSessions.length}
                maxCount={2}
                waitlistCount={waitlistedConsoleSessions.length}
                activeReservations={activeConsoleSessions}
                waitlistedReservations={waitlistedConsoleSessions}
                userRole={userRole}
                currentUser={currentUser}
                onComplete={handleCompleteReservation}
                onDelete={handleDeleteReservation}
                stationType="Console"
              />
            </div>
          </div>
        </div>
      </HeroUIProvider>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
