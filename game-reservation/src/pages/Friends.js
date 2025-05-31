import React, { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

const VALID_STATUSES = ['Online', 'Offline', 'In Game', 'Away', 'Busy'];

export default function Friends() {
  const { currentUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('Offline');
  const [openToFriends, setOpenToFriends] = useState(false);
  const [sentEmails, setSentEmails] = useState(new Set());

  // New state for the message modal
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [currentFriendForModal, setCurrentFriendForModal] = useState(null); // Will store profile._id
  const [customMessage, setCustomMessage] = useState('');
  const [sendingEmailLoading, setSendingEmailLoading] = useState(false);

  // Effect for initial data loading and setting current user's preferences
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) {
        setProfiles([]);
        setFilteredProfiles([]);
        setSelectedStatus('Offline'); 
        setOpenToFriends(false); 
        return;
      }
      try {
        const res = await axios.get("http://localhost:8080/api/view/profiles");
        const allProfiles = res.data;
        
        // Add dummy profile for Nikhil
        const dummyProfile = {
          _id: "dummy-nikhil",
          name: "Nikhil",
          email: "nikhildewitt@g.ucla.edu",
          status: "Online",
          game: "Valorant",
          mode: "Competitive",
          time: "Evening"
        };
        
        setProfiles([...allProfiles, dummyProfile]);

        const currentUserProfile = allProfiles.find(p => p.email === currentUser.email);
        if (currentUserProfile) {
          setSelectedStatus(currentUserProfile.status || 'Offline');
          setOpenToFriends(!!currentUserProfile.openToFriends);
        } else {
          setSelectedStatus('Offline');
          setOpenToFriends(false); 
        }
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setProfiles([]); 
        setSelectedStatus('Offline');
        setOpenToFriends(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Effect for filtering profiles based on search query or when profiles data changes
  useEffect(() => {
    const filtered = profiles.filter(profile => {
      const searchLower = searchQuery.toLowerCase();
      return (
        profile.name?.toLowerCase().includes(searchLower) ||
        profile.email?.toLowerCase().includes(searchLower) ||
        profile.status?.toLowerCase().includes(searchLower) ||
        profile.game?.toLowerCase().includes(searchLower) ||
        profile.mode?.toLowerCase().includes(searchLower) ||
        profile.time?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredProfiles(filtered);
  }, [searchQuery, profiles]);
  
  const refreshProfileListFromServer = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get("http://localhost:8080/api/view/profiles");
      setProfiles(res.data); 
    } catch (err) {
      console.error("Error refreshing profile list:", err);
    }
  };

  const updateStatus = async (newStatus) => {
    if (!currentUser) return;
    
    console.log('Attempting to update status to:', newStatus);
    console.log('Current user:', currentUser.email);
    
    try {
      // Update the UI immediately
      setSelectedStatus(newStatus);
      
      // Make the API call
      const response = await axios.post("http://localhost:8080/api/update/profile/status", {
        email: currentUser.email,
        status: newStatus
      });

      console.log('Status update response:', response.data);

      // Only refresh the profile list if the API call was successful
      if (response.status === 200) {
        await refreshProfileListFromServer();
      }
    } catch (err) {
      console.error("Error updating status:", err);
      // Revert the status on error
      setSelectedStatus(selectedStatus);
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
    setCustomMessage(''); // Reset message
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

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 flex items-center">
          <Link to="/">

            <button
              style={{
                borderRadius: "50%",
                width: "50px",
                height: "50px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: "24px",
                backgroundColor: "blue", // blue-600
                color: "white",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                border: "none",
                outline: "none",
              }}
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
            </button>
          </Link>
        </div>
        <div className="flex-1 flex justify-center">
          <h1 className="text-2xl font-bold">Friends</h1>
        </div>
        <div className="flex-1 flex items-center justify-end gap-12">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Open to Friends</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={openToFriends}
                onChange={handleToggleFriends}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => updateStatus(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2.5"
            >
              {VALID_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <input
          type="text"
          placeholder="Search by name, email, game, etc."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProfiles.map((profile) => (
              <tr key={profile._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{profile.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ 
                    profile.status === 'Online' ? 'bg-green-100 text-green-800' :
                    profile.status === 'In Game' ? 'bg-blue-100 text-blue-800' :
                    profile.status === 'Away' ? 'bg-yellow-100 text-yellow-800' :
                    profile.status === 'Busy' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.status || 'Offline'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.game || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.mode || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{profile.time || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {profile.email !== currentUser?.email && (
                    sentEmails.has(profile._id) ? (

                      <button
                        style={{
                          color: "black",
                          borderRadius: "5px",
                          padding: "10px 20px",
                          fontSize: "16px",
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm bg-gray-300 text-gray-500 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                      >
                        Request Sent
                      </button>
                    ) : (
                      <button
                        onClick={() => openMessageModal(profile._id)}
                        style={{
                          backgroundColor: "blue",
                          color: "white",
                          borderRadius: "5px",
                          padding: "10px 20px",
                          fontSize: "16px",
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Friend
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Message Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-auto">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Send a Message to Friend</h3>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Optional: Add a personal message..."
              rows={4}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 mb-4"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                style={{
                  
                  borderRadius: "5px",
                  padding: "10px 20px",
                  fontSize: "16px",
                }}
                onClick={() => setIsMessageModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              {
                sendingEmailLoading ? (
                  <button
                    disabled
                    type="button"
                    className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm bg-gray-400 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                  >
                    Sending...
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendMessageAndAddFriend}
                    style={{
                      color: "black",
                      borderRadius: "5px",
                      padding: "10px 20px",
                      fontSize: "16px",
                    }}
                    className="px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Send Request
                  </button>
                )
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 