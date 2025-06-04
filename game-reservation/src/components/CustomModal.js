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

  useEffect(() => {
    setSelectedConsoleType(null);
    setPartySize(1);
    setSeatTogether(false);
    setPreferredGame("ANY");
  }, [selectedReservationType]);

  const sendRequest = async (data) => {
    try {
      if (data.email !== currentUser.email || data.name !== currentUser.displayName) {
        alert("You can only create reservations for yourself.");
        return null;
      }

      const response = await axios.post(
        "http://localhost:8080/api/create/reservation",
        data
      );
      console.log("Reservation response:", response.data);
      if (response.data && response.data.message) {
        alert(`Reservation Status: ${response.data.message}`);
      }
      return response.data;
    } catch (error) {
      console.error("Error creating reservation:", error.response ? error.response.data : error.message);
      let errorMessage = "Failed to create reservation.";
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage += ` Error: ${error.response.data.message}`;
      }
      alert(errorMessage);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      alert("Please sign in to make a reservation.");
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
    } else if (selectedReservationType === "CONSOLE") {
      reservationData.consoleType = selectedConsoleType;
    }

    try {
      const result = await sendRequest(reservationData);
      if (result) {
        if (onReservationCreated) onReservationCreated();
        onOpenChange(false);
      }
    } catch (error) {
      console.log("Submit failed, modal remains open for correction.");
    }
  };
  
  const isSubmitDisabled = () => {
    if (!currentUser) return true;
    if (!selectedReservationType) return true;
    if (selectedReservationType === "CONSOLE" && !selectedConsoleType) return true;
    if (selectedReservationType === "PC") {
      if (!partySize) return true;
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
                      {partySizeOptions.map((size) => (
                        <SelectItem key={size.key.toString()} value={size.key.toString()}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </Select>

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
                    <p className="text-xs mt-1 text-gray-500">Note: Apex Legends is only on specific PCs (J & M).</p>
                    
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
