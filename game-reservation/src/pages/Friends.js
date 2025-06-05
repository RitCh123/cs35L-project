import React, { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Switch, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Card, CardBody, Avatar, Chip, Tooltip, Badge, Accordion, AccordionItem } from "@heroui/react";
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

  // Add new state for pending requests
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Add new state for handling request actions
  const [processingRequest, setProcessingRequest] = useState(false);

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

  // Update the effect to fetch pending requests
  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!currentUser) return;
      
      setIsLoadingRequests(true);
      try {
        const response = await axios.get(`http://localhost:8080/api/friends/requests?email=${currentUser.email}`);
        setPendingRequests(response.data);
      } catch (err) {
        console.error("Error fetching pending friend requests:", err);
      } finally {
        setIsLoadingRequests(false);
      }
    };

    fetchPendingRequests();
  }, [currentUser]);

  // Add function to refresh requests
  const refreshPendingRequests = async () => {
    if (!currentUser) return;
    setIsLoadingRequests(true);
    try {
      const response = await axios.get(`http://localhost:8080/api/friends/requests?email=${currentUser.email}`);
      setPendingRequests(response.data);
    } catch (err) {
      console.error("Error refreshing pending friend requests:", err);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  // Add functions to handle accepting/rejecting requests
  const handleAcceptRequest = async (requestId) => {
    if (!currentUser || processingRequest) return;
    
    setProcessingRequest(true);
    try {
      const response = await axios.post(`http://localhost:8080/api/friends/accept/${requestId}`, {
        userEmail: currentUser.email
      });
      
      if (response.status === 200) {
        // Refresh the pending requests list
        await refreshPendingRequests();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setProcessingRequest(false);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!currentUser || processingRequest) return;
    
    setProcessingRequest(true);
    try {
      const response = await axios.post(`http://localhost:8080/api/friends/reject/${requestId}`, {
        userEmail: currentUser.email
      });
      
      if (response.status === 200) {
        // Refresh the pending requests list
        await refreshPendingRequests();
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setProcessingRequest(false);
    }
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
        {/* Update Friend Requests Section */}
        {currentUser && (
          <div className="mb-8">
            <Accordion>
              <AccordionItem
                key="friend-requests"
                aria-label="Friend Requests"
                title={
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span>Friend Requests</span>
                      {pendingRequests.length > 0 && (
                        <Badge color="primary" variant="flat" size="sm">
                          {pendingRequests.length}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      onPress={refreshPendingRequests}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 4V10H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1 20V14H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3.51 9.00001C3.98 7.44001 4.85 6.06001 6.03 5.00001C7.21 3.94001 8.66 3.24001 10.2 2.98001C11.74 2.72001 13.32 2.91001 14.76 3.53001C16.2 4.15001 17.44 5.17001 18.33 6.48001L23 10M1 14L5.67 17.52C6.56 18.83 7.8 19.85 9.24 20.47C10.68 21.09 12.26 21.28 13.8 21.02C15.34 20.76 16.79 20.06 17.97 19C19.15 17.94 20.02 16.56 20.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Button>
                  </div>
                }
              >
                <Card>
                  <CardBody>
                    {isLoadingRequests ? (
                      <div className="flex justify-center p-4">
                        <p>Loading requests...</p>
                      </div>
                    ) : pendingRequests.length === 0 ? (
                      <div className="text-center p-4 text-default-500">
                        No pending friend requests
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {pendingRequests.map((request) => (
                          <div key={request._id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={request.sender.split('@')[0]}
                                size="md"
                                radius="full"
                                color="primary"
                              />
                              <div>
                                <p className="font-semibold">{request.sender}</p>
                                <p className="text-sm text-default-500">
                                  Sent {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                color="success"
                                variant="flat"
                                size="sm"
                                onPress={() => handleAcceptRequest(request._id)}
                                isLoading={processingRequest}
                                isDisabled={processingRequest}
                              >
                                Accept
                              </Button>
                              <Button
                                color="danger"
                                variant="flat"
                                size="sm"
                                onPress={() => handleRejectRequest(request._id)}
                                isLoading={processingRequest}
                                isDisabled={processingRequest}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </AccordionItem>
            </Accordion>
          </div>
        )}

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