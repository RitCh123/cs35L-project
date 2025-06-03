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

  useEffect(() => {
    if (isOpen && currentUser) {
      setLoading(true);
      setError("");
      axios
        .get(`http://localhost:8080/api/view/profile?email=${encodeURIComponent(currentUser.email)}`)
        .then((res) => {
          const profile = res.data;
          setGame(profile.game || "");
          setMode(profile.mode || "");
          setTime(profile.time || "");
          setIsEdit(true);
        })
        .catch((err) => {
          // If not found, treat as create
          setGame("");
          setMode("");
          setTime("");
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
      await axios.post("http://localhost:8080/api/create/profile", {
        name: currentUser.displayName || currentUser.email,
        email: currentUser.email,
        game,
        mode,
        time,
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
      await axios.post("http://localhost:8080/api/update/profile", {
        email: currentUser.email,
        game,
        mode,
        time,
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
        <ModalHeader>Friends</ModalHeader>
        <ModalBody>
          {/* Profile creation fields (no name/email, no search) */}
          <Select
            label="Game"
            placeholder="Select your favorite game"
            selectedKeys={game ? [game] : []}
            onChange={e => setGame(e.target.value)}
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
            onChange={e => setMode(e.target.value)}
            className="mb-2"
          >
            {modeOptions.map(opt => (
              <SelectItem key={opt.key}>{opt.label}</SelectItem>
            ))}
          </Select>
          <Input
            label="Preferred Time"
            placeholder="e.g. 3:00 PM"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="mb-2"
          />
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
            isDisabled={!game || !mode || !time}
          >
            {isEdit ? 'Update Profile' : 'Create Profile'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
