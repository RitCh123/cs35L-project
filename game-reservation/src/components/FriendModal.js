import React, { useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { useAuth } from "../firebase/AuthContext";
import axios from "axios";

export default function FriendModal({ isOpen, onOpenChange, onProfileUpdated }) {
  const { currentUser } = useAuth();
  const [game, setGame] = useState("");
  const [mode, setMode] = useState("");
  const [time, setTime] = useState("");
  const [playStyle, setPlayStyle] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isEdit, setIsEdit] = useState(false);

  const gameOptions = [
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
  const modeOptions = [
    { key: "PC", label: "PC" },
    { key: "XBOX", label: "XBOX" },
    { key: "SWITCH", label: "SWITCH" },
    { key: "PS5", label: "PS5" },
  ];

  const playStyleOptions = [
    { key: "Casual", label: "Casual" },
    { key: "Competitive", label: "Competitive" },
  ];

  const timeOptions = [
    { key: "9:00 AM", label: "9:00 AM" },
    { key: "10:00 AM", label: "10:00 AM" },
    { key: "11:00 AM", label: "11:00 AM" },
    { key: "12:00 PM", label: "12:00 PM" },
    { key: "1:00 PM", label: "1:00 PM" },
    { key: "2:00 PM", label: "2:00 PM" },
    { key: "3:00 PM", label: "3:00 PM" },
    { key: "4:00 PM", label: "4:00 PM" },
    { key: "5:00 PM", label: "5:00 PM" },
    { key: "6:00 PM", label: "6:00 PM" },
    { key: "7:00 PM", label: "7:00 PM" },
    { key: "8:00 PM", label: "8:00 PM" },
    { key: "9:00 PM", label: "9:00 PM" },
  ];

  useEffect(() => {
    if (isOpen && currentUser) {
      setLoading(true);
      setError("");
      axios
        .get(`/api/view/profile?email=${encodeURIComponent(currentUser.email)}`)
        .then((res) => {
          const profile = res.data;
          setGame(profile.game || "");
          setMode(profile.mode || "");
          setTime(profile.time || "");
          setPlayStyle(profile.playStyle || "");
          setIsEdit(true);
        })
        .catch((err) => {
          // If not found, treat as create
          setGame("");
          setMode("");
          setTime("");
          setPlayStyle("");
          setIsEdit(false);
        })
        .finally(() => setLoading(false));
    } else if (!isOpen) {
      setSuccess(false);
      setError("");
    }
  }, [isOpen, currentUser]);

  const handleProfileCreate = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await axios.post("/api/create/profile", {
        name: currentUser.displayName || currentUser.email,
        email: currentUser.email,
        game,
        mode,
        time,
        playStyle,
      });
      setSuccess(true);
      setTimeout(() => {
        onOpenChange();
        setSuccess(false);
      }, 800);
      onProfileUpdated && onProfileUpdated();
    } catch (err) {
      setError("Failed to create profile.");
    }
    setLoading(false);
  };

  const handleProfileUpdate = async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await axios.post("/api/update/profile", {
        email: currentUser.email,
        game,
        mode,
        time,
        playStyle,
      });
      setSuccess(true);
      setTimeout(() => {
        onOpenChange();
        setSuccess(false);
      }, 800);
      onProfileUpdated && onProfileUpdated();
    } catch (err) {
      setError("Failed to update profile.");
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>Update Profile</ModalHeader>
        <ModalBody>
          <Select
            label="Game"
            placeholder="Select your favorite game"
            selectedKeys={game ? [game] : []}
            onSelectionChange={(keys) => setGame(Array.from(keys)[0] || "")}
            className="mb-2"
          >
            {gameOptions.map(opt => (
              <SelectItem key={opt.key}>{opt.label}</SelectItem>
            ))}
          </Select>
          <Select
            label="Mode"
            placeholder="Select your mode of play"
            selectedKeys={mode ? [mode] : []}
            onSelectionChange={(keys) => setMode(Array.from(keys)[0] || "")}
            className="mb-2"
          >
            {modeOptions.map(opt => (
              <SelectItem key={opt.key}>{opt.label}</SelectItem>
            ))}
          </Select>
          <Select
            label="Preferred Time"
            placeholder="Select your preferred time"
            selectedKeys={time ? [time] : []}
            onChange={(e) => setTime(e.target.value)}
            className="mb-2"
          >
            {timeOptions.map((timeOpt) => (
              <SelectItem key={timeOpt.key} value={timeOpt.key}>
                {timeOpt.label}
              </SelectItem>
            ))}
          </Select>
          <Select
            label="Play Style"
            placeholder="Select your play style"
            selectedKeys={playStyle ? [playStyle] : []}
            onSelectionChange={(keys) => setPlayStyle(Array.from(keys)[0] || "")}
            className="mb-2"
          >
            {playStyleOptions.map(opt => (
              <SelectItem key={opt.key}>{opt.label}</SelectItem>
            ))}
          </Select>
          {error && <div style={{ color: 'red', fontSize: 14 }}>{error}</div>}
          {success && <div style={{ color: 'green', fontSize: 14 }}>{isEdit ? 'Profile updated!' : 'Profile created!'}</div>}
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onOpenChange}>
            Close
          </Button>
          <Button
            color="success"
            isLoading={loading}
            onPress={isEdit ? handleProfileUpdate : handleProfileCreate}
            isDisabled={!game || !mode || !time || !playStyle}
          >
            {isEdit ? 'Update Profile' : 'Create Profile'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
