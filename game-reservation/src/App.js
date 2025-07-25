import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "./firebase/AuthContext";
import { useNavigate, Link as RouterLink }  from "react-router-dom";
import {addToast, ToastProvider} from "@heroui/toast";


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
  NavbarItem,
  Button,
  Alert
} from "@heroui/react";

import { ButtonGroup } from "@heroui/button"; // This was already individual
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
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertColor, setAlertColor] = useState("success"); // Changed default to success

  // Functions to show alerts from CustomModal
  const showAlert = (message, color = "success") => {
    setAlertMessage(message);
    setAlertColor(color);
    setAlertVisible(true);
  };

  const showErrorAlert = (message) => {
    showAlert(message, "danger");
  };

  const showSuccessAlert = (message) => {
    showAlert(message, "success");
  };

  const fetchReservations = useCallback(() => {
    axios.get("/api/view/reservations")
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

  useEffect(() => {
    let alertTimeout;
    if (alertVisible) {
      alertTimeout = setTimeout(() => {
        setAlertVisible(false);
      }, 1500);
    }
    return () => clearTimeout(alertTimeout);
  }, [alertVisible]);

  const handleDeleteReservation = async (reservationId) => {
    if (!currentUser) return;

    const reservation = reservations.find(r => r._id === reservationId);
    if (!reservation) {
      setAlertMessage("Reservation not found.");
      setAlertVisible(true);
      return;
    }

    if (userRole !== 'ADMIN' && currentUser.email !== reservation.email) {
      setAlertMessage("You can only delete your own reservations.");
      setAlertVisible(true);
      return;
    }

    try {
      await axios.delete("/api/delete/reservation", {
        data: {
          reservationId,
          userEmail: currentUser.email,
          userRole: userRole,
        },
      });
      fetchReservations();
      setAlertMessage("Reservation Deleted Successfully.");
      setAlertVisible(true);
    } catch (err) {
      console.error("Error deleting reservation:", err.response ? err.response.data : err.message);
      setAlertMessage("Failed to delete reservation: " + (err.response && err.response.data && err.response.data.message ? err.response.data.message : "Server error"));
      setAlertVisible(true);
    }
  };

  const handleCompleteReservation = async (reservationId) => {
    if (!currentUser) return;
    
    if (userRole !== 'ADMIN') {
      setAlertMessage("Only administrators can complete reservations.");
      setAlertVisible(true);
      return;
    }

    try {
      await axios.put(`/api/reservations/complete/${reservationId}`, {
        userEmail: currentUser.email,
        userRole: userRole,
      });
      fetchReservations();
      setAlertMessage("Reservation marked as completed.");
      setAlertVisible(true);
    } catch (err) {
      console.error("Error completing reservation:", err.response ? err.response.data : err.message);
      setAlertMessage("Failed to complete reservation: " + (err.response && err.response.data && err.response.data.message ? err.response.data.message : "Server error"));
      setAlertVisible(true);
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
                <Button onPress={onOpen} color="primary" variant="solid">
                  New Reservation
                </Button>
                <Button as={RouterLink} to="/friends" color="secondary" variant="ghost">
                  Friends
                </Button>
                <Button as={RouterLink} to="/find-players" color="secondary" variant="ghost">
                  Find Players
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
            showAlert={showAlert}
            showErrorAlert={showErrorAlert}
            showSuccessAlert={showSuccessAlert}
        />

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

        {alertVisible && (
          <Alert 
            color={alertColor} 
            title={alertColor === "success" ? "Success" : "Error"} 
            onClose={() => setAlertVisible(false)}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '400px',
              width: 'auto',
              zIndex: 9999
            }}
          >
            {alertMessage}
          </Alert>
        )}
      </HeroUIProvider>
    </>
  );
}

export default function App() {
  return <AppContent />;
}



