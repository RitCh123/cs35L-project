import React, { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Switch, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Card, CardBody, Avatar, Chip, Tooltip, Badge } from "@heroui/react";
import { useDisclosure } from "@heroui/react";
import axios from 'axios';
import { Link } from 'react-router-dom';

import FriendModal from "../components/FriendModal.js";

export default function Friends() {
  const {
    isOpen: isProfileOpen,
    onOpen: onOpenProfile,
    onOpenChange: onProfileOpenChange,
  } = useDisclosure();

  const { currentUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [openToFriends, setOpenToFriends] = useState(false);
  const [sentEmails, setSentEmails] = useState(new Set());

  // New state for the message modal
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [currentFriendForModal, setCurrentFriendForModal] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [sendingEmailLoading, setSendingEmailLoading] = useState(false);

  // Effect for initial data loading and setting current user's preferences
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        setProfiles([]);
        setFilteredProfiles([]);
        setOpenToFriends(false); 
        return;
      }
      try {
        const res = await axios.get("http://localhost:8080/api/view/profiles");
        let allProfiles = res.data;
        
        const dummyProfile = {
          _id: "dummy-nikhil",
          name: "Nikhil",
          email: "nikhildewitt@g.ucla.edu",
          game: "Valorant",
          mode: "Competitive",
          time: "Evening",
          playStyle: "Competitive"
        };
        
        allProfiles = [...allProfiles, dummyProfile].map(p => ({
            ...p, 
            playStyle: p.playStyle || 'Casual' 
        }));
        setProfiles(allProfiles);

        const currentUserProfile = res.data.find(p => p.email === currentUser.email);
        if (currentUserProfile) {
          setOpenToFriends(!!currentUserProfile.openToFriends);
        } else {
          setOpenToFriends(false); 
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setProfiles([]); 
        setOpenToFriends(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Effect for filtering profiles based on search query
  useEffect(() => {
    const filtered = profiles.filter(profile => {
      // First filter out the current user's own profile
      if (profile.email === currentUser?.email) {
        return false;
      }
      
      const searchLower = searchQuery.toLowerCase();
      return (
        profile.name?.toLowerCase().includes(searchLower) ||
        profile.email?.toLowerCase().includes(searchLower) ||
        profile.game?.toLowerCase().includes(searchLower) ||
        profile.mode?.toLowerCase().includes(searchLower) ||
        profile.time?.toLowerCase().includes(searchLower) ||
        profile.playStyle?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredProfiles(filtered);
  }, [searchQuery, profiles, currentUser]);
  
  const refreshProfileListFromServer = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get("http://localhost:8080/api/view/profiles");
      let refreshedProfiles = res.data;
      const dummyProfile = {
          _id: "dummy-nikhil", name: "Nikhil", email: "nikhildewitt@g.ucla.edu",
          game: "Valorant", mode: "Competitive", time: "Evening", playStyle: "Competitive"
      };
      refreshedProfiles = [...refreshedProfiles, dummyProfile].map(p => ({...p, playStyle: p.playStyle || 'Casual' }));
      setProfiles(refreshedProfiles); 
    } catch (err) {
      console.error("Error refreshing profile list:", err);
    }
  };

  const handleToggleFriends = async () => {
    if (!currentUser) return;
    
    const previousOpenToFriends = openToFriends;
    const newValue = !openToFriends;
    
    setOpenToFriends(newValue);

    try {
      await axios.post("http://localhost:8080/api/update/profile/friends", {
        email: currentUser.email,
        openToFriends: newValue
      });
      await refreshProfileListFromServer();
    } catch (err) {
      console.error("Error updating friends preference:", err);
      setOpenToFriends(previousOpenToFriends);
    }
  };

  const openMessageModal = (friendProfileId) => {
    setCurrentFriendForModal(friendProfileId);
    setCustomMessage('');
    setIsMessageModalOpen(true);
  };

  const handleSendMessageAndAddFriend = async () => {
    if (!currentUser || !currentFriendForModal) {
      console.error("User or friend details missing for sending message.");
      return;
    }
    setSendingEmailLoading(true);
    try {
      const addResponse = await fetch('http://localhost:8080/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestorEmail: currentUser.email,
          friendProfileId: currentFriendForModal
        }),
      });

      if (!addResponse.ok) {
        const errorData = await addResponse.json().catch(() => ({ message: 'Failed to add friend (server error)' }));
        throw new Error(errorData.message || 'Failed to add friend');
      }

      const emailResponse = await fetch('http://localhost:8080/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestorName: currentUser.displayName || currentUser.email,
          friendProfileId: currentFriendForModal,
          customMessage: customMessage
        }),
      });

      if (!emailResponse.ok) {
        const emailErrorData = await emailResponse.json().catch(() => ({ message: 'Failed to send friend request email (server error)' }));
        console.error('Failed to send friend request email:', emailErrorData.message);
      }

      setSentEmails(prev => new Set(prev).add(currentFriendForModal));
      setIsMessageModalOpen(false);
      setCurrentFriendForModal(null);
      setCustomMessage('');
    } catch (error) {
      console.error('Error in handleSendMessageAndAddFriend:', error.message);
    } finally {
      setSendingEmailLoading(false);
    }
  };

  const handleProfileUpdated = async () => {
    await refreshProfileListFromServer();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 flex items-center">
          <Link to="/">
            <Button
              isIconOnly
              color="primary"
              variant="solid"
              radius="full"
              size="lg"
              aria-label="Home"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path
                  d="M10 2L2 10h3v6h4v-4h2v4h4v-6h3L10 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </Button>
          </Link>
        </div>
        <div className="flex-1 flex justify-center">
          <h1 className="text-2xl font-bold">Friends</h1>
        </div>
        <div className="flex-1 flex items-center justify-end gap-3">
          <Button
            color="primary"
            variant="solid"
            onPress={onOpenProfile}
          >
            Update Profile
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Open to Friends</span>
            <Switch
              checked={openToFriends}
              onChange={handleToggleFriends}
              color="primary"
            />
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '3rem' }}>
        <div className="mb-4" style={{ marginBottom: '2rem' }}>
          <Input
            type="text"
            placeholder="Search by name, email, game, mode, play style, etc."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="bordered"
            radius="lg"
            size="lg"
            fullWidth
            startContent={
              <svg
                aria-hidden="true"
                fill="none"
                focusable="false"
                height="1em"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="1em"
                className="text-default-400"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            }
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <Table aria-label="Friends list">
            <TableHeader>
              <TableColumn>Player</TableColumn>
              <TableColumn>Contact</TableColumn>
              <TableColumn>Game Details</TableColumn>
              <TableColumn>Availability</TableColumn>
              <TableColumn>Action</TableColumn>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map((profile) => (
                <TableRow key={profile._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={profile.name}
                        size="md"
                        radius="full"
                        color="primary"
                      />
                      <div>
                        <p className="text-lg font-semibold">{profile.name}</p>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={profile.playStyle === 'Competitive' ? 'danger' : 'success'}
                        >
                          {profile.playStyle || 'Casual'}
                        </Chip>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip content="Send email">
                      <div className="cursor-pointer">
                        <p className="text-sm text-default-500">{profile.email}</p>
                      </div>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-2">
                      <Badge color="primary" variant="flat" size="sm">
                        {profile.game || 'N/A'}
                      </Badge>
                      <Badge color="secondary" variant="flat" size="sm">
                        {profile.mode || 'N/A'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="sm"
                      variant="dot"
                      color={profile.time ? 'success' : 'default'}
                    >
                      {profile.time || 'Not specified'}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    {sentEmails.has(profile._id) ? (
                      <Button
                        color="default"
                        variant="flat"
                        isDisabled
                        startContent={<CheckIcon />}
                      >
                        Request Sent
                      </Button>
                    ) : (
                      <Button
                        color="primary"
                        variant="solid"
                        onPress={() => openMessageModal(profile._id)}
                        startContent={<AddFriendIcon />}
                      >
                        Friend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal 
        isOpen={isMessageModalOpen} 
        onClose={() => setIsMessageModalOpen(false)}
      >
        <ModalContent>
          <ModalHeader>Send a Message to Friend</ModalHeader>
          <ModalBody>
            <Input
              type="text"
              placeholder="Optional: Add a personal message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              variant="bordered"
              fullWidth
            />
          </ModalBody>
          <ModalFooter>
            <Button
              color="default"
              variant="light"
              onPress={() => setIsMessageModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              variant="solid"
              onPress={handleSendMessageAndAddFriend}
              isLoading={sendingEmailLoading}
            >
              Send Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      <FriendModal 
        isOpen={isProfileOpen} 
        onOpenChange={onProfileOpenChange} 
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}

const CheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AddFriendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20 8V14M17 11H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
); 