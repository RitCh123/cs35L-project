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
  const [sentRequests, setSentRequests] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  // Add new state for accepted friends
  const [acceptedFriends, setAcceptedFriends] = useState([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  // Add new state for handling request actions
  const [processingRequest, setProcessingRequest] = useState(false);

  // Add new state for handling friend removal
  const [processingFriendAction, setProcessingFriendAction] = useState(false);

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
        console.log('[Friends] Loading initial data for', currentUser.email);
        
        // First fetch or create the user's profile
        const userProfileRes = await axios.get(`/api/view/profile?email=${currentUser.email}`);
        console.log('[Friends] User profile response:', userProfileRes.data);
        
        // Explicitly handle the visibility state
        const visibility = userProfileRes.data?.openToFriends === true;
        console.log('[Friends] Setting initial visibility to:', visibility);
        setOpenToFriends(visibility);

        // Then fetch all visible profiles
        const res = await axios.get("/api/view/profiles");
        console.log('[Friends] Fetched visible profiles:', res.data);
        
        let allProfiles = res.data.map(p => ({
          ...p,
          playStyle: p.playStyle || 'Casual',
          openToFriends: p.openToFriends === true
        }));
        setProfiles(allProfiles);
      } catch (err) {
        console.error("[Friends] Error fetching initial data:", err);
        setProfiles([]);
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
      console.log('[Friends] Refreshing profile list');
      const res = await axios.get("/api/view/profiles");
      let refreshedProfiles = res.data.map(p => ({
        ...p,
        playStyle: p.playStyle || 'Casual',
        openToFriends: p.openToFriends === true
      }));
      setProfiles(refreshedProfiles);
      console.log('[Friends] Profile list refreshed');
    } catch (err) {
      console.error("[Friends] Error refreshing profile list:", err);
    }
  };

  const handleToggleFriends = async () => {
    if (!currentUser) return;
    
    const newValue = !openToFriends;
    console.log('[Friends] Toggling visibility to:', newValue);
    
    try {
      // First update the UI optimistically
      setOpenToFriends(newValue);

      // Then update the server with explicit boolean
      const response = await axios.post("/api/update/profile/friends", {
        email: currentUser.email,
        openToFriends: Boolean(newValue)
      });

      console.log('[Friends] Toggle response:', response.data);

      // Verify the server state matches our local state
      const serverVisibility = response.data.profile?.openToFriends === true;
      if (serverVisibility !== newValue) {
        console.log('[Friends] Server state mismatch, reverting to:', serverVisibility);
        setOpenToFriends(serverVisibility);
      }

      // Refresh the profile list
      await refreshProfileListFromServer();
    } catch (err) {
      // If there's an error, revert the UI
      console.error("[Friends] Error updating visibility:", err);
      setOpenToFriends(!newValue);
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
      const addResponse = await fetch('/api/friends/add', {
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

      const emailResponse = await fetch('/api/friends/request', {
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
        const response = await axios.get(`/api/friends/requests?email=${currentUser.email}`);
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
      const response = await axios.get(`/api/friends/requests?email=${currentUser.email}`);
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
      const response = await axios.post(`/api/friends/accept/${requestId}`, {
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
      const response = await axios.post(`/api/friends/reject/${requestId}`, {
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

  // Add new effect to fetch accepted friends
  useEffect(() => {
    const fetchAcceptedFriends = async () => {
      if (!currentUser) return;
      
      setIsLoadingFriends(true);
      try {
        const response = await axios.get(`/api/friends/accepted?email=${currentUser.email}`);
        setAcceptedFriends(response.data.friends);
      } catch (err) {
        console.error("Error fetching accepted friends:", err);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchAcceptedFriends();
  }, [currentUser]);

  // Add function to refresh accepted friends
  const refreshAcceptedFriends = async () => {
    if (!currentUser) return;
    setIsLoadingFriends(true);
    try {
      const response = await axios.get(`/api/friends/accepted?email=${currentUser.email}`);
      setAcceptedFriends(response.data.friends);
    } catch (err) {
      console.error("Error refreshing accepted friends:", err);
    } finally {
      setIsLoadingFriends(false);
    }
  };

  // Add this effect after the pendingRequests effect
  useEffect(() => {
    const fetchSentRequests = async () => {
      if (!currentUser) return;
      try {
        const response = await axios.get(`/api/friends/sent?email=${currentUser.email}`);
        setSentRequests(response.data);
      } catch (err) {
        console.error("Error fetching sent friend requests:", err);
      }
    };
    fetchSentRequests();
  }, [currentUser]);

  // Add this helper function before the return statement
  const getRequestStatus = (profileId) => {
    const profile = profiles.find(p => p._id === profileId);
    if (!profile) return 'none';
    
    // Check if they are already friends
    if (acceptedFriends.some(friend => friend.email === profile.email)) return 'friends';
    // Check if they sent you a request
    if (pendingRequests.some(req => req.sender === profile.email)) return 'received';
    // Check if you sent them a request
    if (sentRequests.some(req => req.recipient === profile.email)) return 'sent';
    return 'none';
  };

  // Add function to handle friend removal
  const handleRemoveFriend = async (friendEmail) => {
    if (!currentUser || processingFriendAction) return;
    
    setProcessingFriendAction(true);
    try {
      const response = await axios.post('/api/friends/remove', {
        userEmail: currentUser.email,
        friendEmail: friendEmail
      });
      
      if (response.status === 200) {
        // Refresh the friends list
        await refreshAcceptedFriends();
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setProcessingFriendAction(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>Friends</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Button
            color="primary"
            variant="solid"
            onPress={onOpenProfile}
          >
            Edit Profile
          </Button>
          <Card style={{ padding: '0.5rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--nextui-colors-accents6)' }}>Profile Visibility</span>
                <span style={{ fontSize: '0.75rem', color: openToFriends ? 'var(--nextui-colors-success)' : 'var(--nextui-colors-accents5)' }}>
                  {openToFriends ? 'Visible to Others' : 'Private Profile'}
                </span>
              </div>
              <Switch
                checked={openToFriends}
                onChange={handleToggleFriends}
                color="success"
                size="lg"
              />
            </div>
          </Card>
        </div>
      </div>

      <Card style={{ marginBottom: '2rem' }}>
        <CardBody>
          <Input
            type="text"
            placeholder="Search friends by name, game, or play style..."
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
                style={{ color: 'var(--nextui-colors-accents6)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            }
          />
        </CardBody>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card>
            <CardBody style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Friend Requests</h2>
                <Badge color="primary" variant="flat" size="sm">
                  {pendingRequests.length}
                </Badge>
              </div>
              {isLoadingRequests ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                  <p>Loading requests...</p>
                </div>
              ) : pendingRequests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--nextui-colors-accents6)' }}>
                  No pending requests
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pendingRequests.map((request) => (
                    <Card key={request._id} variant="flat">
                      <CardBody style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Avatar
                              name={request.senderProfile?.name || request.sender}
                              size="sm"
                              radius="full"
                              color="primary"
                            />
                            <div>
                              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                                {request.senderProfile?.name || 'Unknown User'}
                              </span>
                              <p style={{ fontSize: '0.75rem', color: 'var(--nextui-colors-accents6)', margin: '0' }}>
                                {request.sender}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              color="success"
                              variant="flat"
                              size="sm"
                              onPress={() => handleAcceptRequest(request._id)}
                              isDisabled={processingRequest}
                              fullWidth
                            >
                              Accept
                            </Button>
                            <Button
                              color="danger"
                              variant="flat"
                              size="sm"
                              onPress={() => handleRejectRequest(request._id)}
                              isDisabled={processingRequest}
                              fullWidth
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>My Friends</h2>
                <Badge color="success" variant="flat" size="sm">
                  {acceptedFriends.length}
                </Badge>
              </div>
              {isLoadingFriends ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
                  <p>Loading friends...</p>
                </div>
              ) : acceptedFriends.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--nextui-colors-accents6)' }}>
                  No friends yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {acceptedFriends.map((friend) => (
                    <Card key={friend.email} variant="flat">
                      <CardBody style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Avatar
                              name={friend.profile?.name}
                              size="md"
                              radius="full"
                              color="success"
                            />
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: '500', margin: 0 }}>{friend.profile?.name || 'Unknown User'}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--nextui-colors-accents6)', margin: '0.25rem 0 0 0' }}>
                                {friend.email}
                              </p>
                              {friend.profile && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                  <Badge color="primary" variant="flat" size="sm">
                                    {friend.profile.game || 'No game'}
                                  </Badge>
                                  <Badge color="secondary" variant="flat" size="sm">
                                    {friend.profile.playStyle || 'Casual'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            color="danger"
                            variant="light"
                            size="sm"
                            isIconOnly
                            onPress={() => handleRemoveFriend(friend.email)}
                            isDisabled={processingFriendAction}
                            style={{ minWidth: '32px', height: '32px' }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </Button>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardBody>
            <Table aria-label="Available Players">
              <TableHeader>
                <TableColumn>Player</TableColumn>
                <TableColumn>Game Details</TableColumn>
                <TableColumn>Availability</TableColumn>
                <TableColumn>Action</TableColumn>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => (
                  <TableRow key={profile._id}>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Avatar
                          name={profile.name}
                          size="md"
                          radius="full"
                          color="primary"
                        />
                        <div>
                          <p style={{ fontSize: '1rem', fontWeight: '500', margin: 0 }}>{profile.name}</p>
                          <p style={{ fontSize: '0.875rem', color: 'var(--nextui-colors-accents6)', margin: 0 }}>{profile.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <Badge color="primary" variant="flat" size="sm">
                          {profile.game || 'No game'}
                        </Badge>
                        <Badge color="secondary" variant="flat" size="sm">
                          {profile.playStyle || 'Casual'}
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
                      {(() => {
                        const status = getRequestStatus(profile._id);
                        if (status === 'friends') {
                          return (
                            <Button
                              color="success"
                              variant="flat"
                              isDisabled
                              startContent={<CheckIcon />}
                              fullWidth
                            >
                              Friends
                            </Button>
                          );
                        }
                        if (status === 'sent') {
                          return (
                            <Button
                              color="default"
                              variant="flat"
                              isDisabled
                              startContent={<CheckIcon />}
                              fullWidth
                            >
                              Request Sent
                            </Button>
                          );
                        }
                        if (status === 'received') {
                          return (
                            <Button
                              color="warning"
                              variant="flat"
                              onPress={() => handleAcceptRequest(pendingRequests.find(req => req.senderProfileId === profile._id)?._id)}
                              fullWidth
                            >
                              Respond
                            </Button>
                          );
                        }
                        return (
                          <Button
                            color="primary"
                            variant="solid"
                            onPress={() => openMessageModal(profile._id)}
                            startContent={<AddFriendIcon />}
                            fullWidth
                          >
                            Add Friend
                          </Button>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
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