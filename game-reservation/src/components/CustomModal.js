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
  renderInput = false,
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

  const [inputName, setInputName] = useState("");
  const [inputEmail, setInputEmail] = useState("");

  useEffect(() => {
    if (currentUser) {
      setInputName(currentUser.displayName || "");
      setInputEmail(currentUser.email || "");
    }
  }, [currentUser]);

  useEffect(() => {
    setSelectedConsoleType(null);
    setPartySize(1);
    setSeatTogether(false);
    setPreferredGame("ANY");
  }, [selectedReservationType]);

  const sendRequest = async (data) => {
    try {
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
      alert("Failed to create reservation: " + (error.response && error.response.data && error.response.data.message ? error.response.data.message : "Server error"));
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      alert("Please sign in to make a reservation.");
      return;
    }

    const reservationData = {
      name: currentUser.displayName || inputName,
      email: currentUser.email || inputEmail,
      reservationType: selectedReservationType,
    };

    if (selectedReservationType === "PC") {
      reservationData.partySize = partySize;
      reservationData.seatTogether = seatTogether;
      reservationData.preferredGame = preferredGame === "ANY" ? null : "Apex Legends";
    } else if (selectedReservationType === "CONSOLE") {
      reservationData.consoleType = selectedConsoleType;
    }

    try {
      await sendRequest(reservationData);
      if (onReservationCreated) onReservationCreated();
      onOpenChange(false);
    } catch (error) {
      console.log("Submit failed, modal remains open for correction.");
    }
  };
  
  const isSubmitDisabled = () => {
    if (!selectedReservationType) return true;
    if (selectedReservationType === "CONSOLE" && !selectedConsoleType) return true;
    if (selectedReservationType === "PC" && !partySize) return true;
    return false;
  };

  return (
    <>
      <Modal isOpen={isOpen} placement="top-center" onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Create a Reservation
              </ModalHeader>
              <ModalBody className="gap-4">
                {currentUser && (
                  <div className="mb-4">
                    <p><strong>Name:</strong> {currentUser.displayName || "N/A"}</p>
                    <p><strong>Email:</strong> {currentUser.email || "N/A"}</p>
                  </div>
                )}
                
                <Select
                  label="Reservation Type"
                  placeholder="Select PC or Console"
                  selectedKeys={selectedReservationType ? [selectedReservationType] : []}
                  onChange={(e) => setSelectedReservationType(e.target.value)}
                  className="max-w-base"
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
                    <p className="text-xs mt-1">Note: Apex Legends is only on PCs J & M.</p>
                    
                    <div className="mt-4 flex items-center">
                        <Checkbox 
                            isSelected={seatTogether} 
                            onValueChange={setSeatTogether}
                        />
                        <span className="ml-2 text-sm">Attempt to seat party together?</span>
                    </div>
                    <Link href="/pcs" target="_blank">
                        <p className="text-sm mt-2" style={{ color: "blue" }}>
                            View PC Layout (A-M)
                        </p>
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
