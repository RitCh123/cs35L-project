import React, { useState } from "react";
import { useAuth } from "../firebase/AuthContext";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  Checkbox,
  Input,
  Link,
} from "@heroui/react";

import { Autocomplete, AutocompleteItem } from "@heroui/react";

import { Select, SelectItem } from "@heroui/react";

import axios from "axios";

export const MailIcon = (props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
        fill="currentColor"
      />
    </svg>
  );
};

export default function CustomModal({ isOpen, onOpen, onOpenChange, onReservationCreated }) {
  const { currentUser } = useAuth();
  const modes = [
    { key: "PC", label: "PC", isConsole: false },
    { key: "XBOX", label: "XBOX", isConsole: true },
    { key: "SWITCH", label: "SWITCH", isConsole: true },
    { key: "PS5", label: "PS5", isConsole: true },
  ];

  const games = [
    { key: "FIFA", label: "FIFA 23" },
    { key: "NBA", label: "NBA 2K23" },
    { key: "COD", label: "Call of Duty: Modern Warfare II" },
    { key: "MADDEN", label: "Madden NFL 23" },
    { key: "GOW", label: "God of War Ragnarök" },
    { key: "ZELDA", label: "The Legend of Zelda: Tears of the Kingdom" },
    { key: "HORIZON", label: "Horizon Forbidden West" },
    { key: "RDR2", label: "Red Dead Redemption 2" },
    { key: "FARCRY", label: "Far Cry 6" },
    { key: "MINECRAFT", label: "Minecraft" },
    { key: "FORTNITE", label: "Fortnite" },
    { key: "VALORANT", label: "Valorant" },
    { key: "LEAGUE", label: "League of Legends" },
  ];

  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedConsoleType, setSelectedConsoleType] = useState(null);

  const modeOptions = [
    { key: "PC", label: "PC" },
    { key: "CONSOLE", label: "Console" },
  ];
  const consoleTypeOptions = [
    { key: "Switch", label: "Switch" },
    { key: "Xbox", label: "Xbox" },
    { key: "PS5", label: "PS5" },
  ];

  const sendRequest = async (data) => {
    try {
      const response = await axios.post(
        "http://localhost:8080/api/create/reservation",
        data
      );
      console.log("Reservation created:", response.data);
    } catch (error) {
      console.error("Error creating reservation:", error);
    }
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
              <ModalBody>
                <Select
                  className="max-w-base"
                  label="Mode of play"
                  placeholder="Select your mode of play"
                  onChange={(e) => {
                    setSelectedMode(e.target.value);
                    setSelectedConsoleType(null); // Reset console type if mode changes
                  }}
                >
                  {modeOptions.map((mode) => (
                    <SelectItem key={mode.key}>{mode.label}</SelectItem>
                  ))}
                </Select>
                {selectedMode === "CONSOLE" && (
                  <Select
                    className="max-w-base"
                    label="Console Type"
                    placeholder="Select console type"
                    onChange={(e) => setSelectedConsoleType(e.target.value)}
                  >
                    {consoleTypeOptions.map((console) => (
                      <SelectItem key={console.key}>{console.label}</SelectItem>
                    ))}
                  </Select>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="flat" onPress={onClose}>
                  Close
                </Button>
                <Button
                  color="success"
                  onPress={async () => {
                    const reservation = {
                      name: currentUser.displayName || currentUser.email,
                      email: currentUser.email,
                      mode: selectedMode,
                    };
                    if (selectedMode === "CONSOLE") {
                      reservation.consoleType = selectedConsoleType;
                    }
                    await sendRequest(reservation);
                    if (onReservationCreated) onReservationCreated();
                    onClose();
                  }}
                  isDisabled={
                    !selectedMode ||
                    (selectedMode === "CONSOLE" && !selectedConsoleType)
                  }
                >
                  Create
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
