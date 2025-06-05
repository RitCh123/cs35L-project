import React, { useState, useEffect } from "react";
import { useAuth } from "../firebase/AuthContext";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
  Input,
  Link,
} from "@heroui/react";

import { Select, SelectItem } from "@heroui/react";

import axios from "axios";

export default function CustomModal({
  isOpen,
  onOpenChange,
  onReservationCreated,
  showAlert,
  showErrorAlert,
  showSuccessAlert,
  // renderInput prop seems unused, can be reviewed for removal
}) {
  const { currentUser } = useAuth();
  
  const reservationTypeOptions = [
    { key: "PC", label: "PC" },
    { key: "CONSOLE", label: "Console" },
  ];
  const consoleTypeOptions = [
    { key: "SWITCH", label: "Switch" },
    { key: "XBOX", label: "Xbox" },
    { key: "PS5", label: "PS5" },
  ];

  const pcGameOptions = [
    { key: "ANY", label: "Any Game" },
    { key: "APEX", label: "Apex Legends" },
  ];

  const partySizeOptions = [
    { key: 1, label: "1 Player" },
    { key: 2, label: "2 Players" },
    { key: 3, label: "3 Players" },
    { key: 4, label: "4 Players" },
  ];

  const [selectedReservationType, setSelectedReservationType] = useState(null);
  const [selectedConsoleType, setSelectedConsoleType] = useState(null);
  const [partySize, setPartySize] = useState(1);
  const [seatTogether, setSeatTogether] = useState(false);
  const [preferredGame, setPreferredGame] = useState("ANY");
  const [profiles, setProfiles] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);

  useEffect(() => {
    setSelectedConsoleType(null);
    setPartySize(1);
    setSeatTogether(false);
    setPreferredGame("ANY");
    setSelectedFriends([]);
  }, [selectedReservationType]);

  // Add effect to handle Apex Legends party size restrictions
  useEffect(() => {
    if (preferredGame === "APEX" && partySize > 2) {
      setPartySize(2);
      setSelectedFriends([]);
    }
  }, [preferredGame]);

  // Load profiles when modal opens
  useEffect(() => {
    if (isOpen && currentUser) {
      axios.get("http://localhost:8080/api/view/profiles")
        .then((res) => {
          // Filter out current user and map to format needed for select
          const filteredProfiles = res.data
            .filter(profile => profile.email !== currentUser.email)
            .map(profile => ({
              key: profile._id,
              label: profile.email.split('@')[0], // Use email username as display name
              email: profile.email,
              name: profile.email.split('@')[0]
            }));
          setProfiles(filteredProfiles);
        })
        .catch((err) => {
          console.error("Error fetching profiles:", err);
          setProfiles([]);
        });
    }
  }, [isOpen, currentUser]);

  // Reset selected friends when party size changes
  useEffect(() => {
    if (selectedFriends.length >= partySize) {
      setSelectedFriends(prev => prev.slice(0, partySize - 1));
    }
  }, [partySize]);

  const sendRequest = async (data) => {
    try {
      if (data.email !== currentUser.email || data.name !== currentUser.displayName) {
        showErrorAlert("You can only create reservations for yourself.");
        return null;
      }

      const response = await axios.post(
        "http://localhost:8080/api/create/reservation",
        data
      );
      console.log("Reservation response:", response.data);
      if (response.data && response.data.message) {
        showSuccessAlert(`Reservation Status: ${response.data.message}`);
      }
      return response.data;
    } catch (error) {
      console.error("Error creating reservation:", error.response ? error.response.data : error.message);
      let errorMessage = "Failed to create reservation.";
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage += ` Error: ${error.response.data.message}`;
      }
      showErrorAlert(errorMessage);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      showErrorAlert("Please sign in to make a reservation.");
      return;
    }

    // Add Apex Legends party size validation
    if (selectedReservationType === "PC" && preferredGame === "APEX" && partySize > 2) {
      showErrorAlert("Apex Legends can only be played with a maximum of 2 players.");
      return;
    }

    const reservationData = {
      name: currentUser.displayName,
      email: currentUser.email,
      reservationType: selectedReservationType,
      partySize: selectedReservationType === "PC" ? partySize : 1,
    };

    if (selectedReservationType === "PC") {
      reservationData.seatTogether = seatTogether;
      reservationData.preferredGame = preferredGame;
      // Always include the current user's email in party members
      const partyMembers = [currentUser.email];
      if (selectedFriends.length > 0) {
        // Add selected friends' emails
        selectedFriends.forEach(friendId => {
          const friend = profiles.find(p => p.key === friendId);
          if (friend) {
            partyMembers.push(friend.email);
          }
        });
      }
      reservationData.partyMembers = partyMembers;
    } else if (selectedReservationType === "CONSOLE") {
      reservationData.consoleType = selectedConsoleType;
    }

    console.log("Final reservation data:", reservationData); // Debug log

    try {
      const result = await sendRequest(reservationData);
      if (result) {
        if (onReservationCreated) onReservationCreated();
        // Delay closing the modal to allow success alert to be visible
        setTimeout(() => {
          onOpenChange(false);
        }, 2500); // Give time for alert to show (alert auto-hides after 2000ms)
      }
    } catch (error) {
      console.log("Submit failed, modal remains open for correction.");
      // Modal stays open so user can see error alert and try again
    }
  };
  
  const isSubmitDisabled = () => {
    if (!currentUser) return true;
    if (!selectedReservationType) return true;
    if (selectedReservationType === "CONSOLE" && !selectedConsoleType) return true;
    if (selectedReservationType === "PC") {
      if (!partySize) return true;
      // If party size > 1, require at least one friend selected
      if (partySize > 1 && selectedFriends.length === 0) return true;
    }
    return false;
  };

  return (
    <>
      <Modal isOpen={isOpen} placement="top-center" onOpenChange={onOpenChange} scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Create a Reservation
              </ModalHeader>
              <ModalBody className="gap-4">
                {currentUser && (
                  <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                    <p className="text-sm"><strong>Reserving for:</strong> {currentUser.displayName || "N/A"} ({currentUser.email || "N/A"})</p>
                  </div>
                )}
                
                <Select
                  label="Reservation Type"
                  placeholder="Select PC or Console"
                  selectedKeys={selectedReservationType ? [selectedReservationType] : []}
                  onChange={(e) => setSelectedReservationType(e.target.value)}
                  className="max-w-base"
                  isRequired
                >
                  {reservationTypeOptions.map((type) => (
                    <SelectItem key={type.key} value={type.key}>
                      {type.label}
                    </SelectItem>
                  ))}
                </Select>

                {selectedReservationType === "CONSOLE" && (
                  <Select
                    label="Console Type"
                    placeholder="Select console type"
                    selectedKeys={selectedConsoleType ? [selectedConsoleType] : []}
                    onChange={(e) => setSelectedConsoleType(e.target.value)}
                    className="max-w-base mt-4"
                    isRequired
                  >
                    {consoleTypeOptions.map((console) => (
                      <SelectItem key={console.key} value={console.key}>
                        {console.label}
                      </SelectItem>
                    ))}
                  </Select>
                )}

                {selectedReservationType === "PC" && (
                  <>
                    <Select
                      label="Party Size"
                      placeholder="Select party size"
                      selectedKeys={partySize ? [partySize.toString()] : []}
                      onChange={(e) => setPartySize(parseInt(e.target.value, 10))}
                      className="max-w-base mt-4"
                      isRequired
                    >
                      {partySizeOptions
                        .filter(size => preferredGame !== "APEX" || size.key <= 2)
                        .map((size) => (
                          <SelectItem key={size.key.toString()} value={size.key.toString()}>
                            {size.label}
                          </SelectItem>
                        ))}
                    </Select>

                    {partySize > 1 && (
                      <>
                      <Select
                        label="Select Friends"
                        placeholder="Choose friends to invite"
                        selectedKeys={selectedFriends}
                        onSelectionChange={(keys) => {
                            const keyArray = Array.from(keys);
                            // Limit selection to partySize - 1 (accounting for current user)
                            if (keyArray.length <= partySize - 1) {
                              setSelectedFriends(keyArray);
                            }
                        }}
                        className="max-w-base mt-4"
                        isRequired
                        selectionMode="multiple"
                        isDisabled={profiles.length === 0}
                      >
                        {profiles.map((profile) => (
                          <SelectItem key={profile.key} value={profile.key}>
                            {profile.label}
                          </SelectItem>
                        ))}
                      </Select>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                          You can select up to {partySize - 1} friend{partySize - 1 !== 1 ? 's' : ''} (Party size: {partySize})
                        </p>
                      </>
                    )}

                    <Select
                      label="Preferred Game (PC)"
                      placeholder="Select preferred game"
                      selectedKeys={preferredGame ? [preferredGame] : []}
                      onChange={(e) => setPreferredGame(e.target.value)}
                      className="max-w-base mt-4"
                    >
                      {pcGameOptions.map((game) => (
                        <SelectItem key={game.key} value={game.key}>
                          {game.label}
                        </SelectItem>
                      ))}
                    </Select>
                    <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                      Note: Apex Legends is only on specific PCs (J & M).
                    </p>
                    
                    <div className="mt-4 flex items-center">
                        <Checkbox 
                            isSelected={seatTogether} 
                            onValueChange={setSeatTogether}
                        />
                        <span className="ml-2 text-sm">Attempt to seat party together?</span>
                    </div>
                    <Link href="/pcs" target="_blank" className="text-sm mt-2 text-blue-600 hover:underline">
                        View PC Layout (A-M)
                    </Link>
                  </>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color="success"
                  onPress={handleSubmit}
                  isDisabled={isSubmitDisabled()}
                >
                  Create Reservation
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
