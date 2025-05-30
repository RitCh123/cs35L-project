import React, { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

const VALID_STATUSES = ['Online', 'Offline', 'In Game', 'Away', 'Busy'];

export default function Friends() {
  const { currentUser } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('Offline');
  const [openToFriends, setOpenToFriends] = useState(false);

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
        setProfiles(allProfiles);

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
    const filtered = profiles.filter(profile => 
      profile.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
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
                backgroundColor: "#2563eb", // blue-600
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                border: "none",
                outline: "none",
              }}
              aria-label="Home"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
                <path
                  d="M10 2L2 10h3v6h4v-4h2v4h4v-6h3L10 2z"
                  stroke="white"
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
                className="sr-only"
                checked={openToFriends}
                onChange={handleToggleFriends}
              />
              <div 
                className="relative w-12 h-6 rounded-full border-2 transition-all duration-300 ease-in-out"
                style={{
                  backgroundColor: openToFriends ? '#10b981' : '#d1d5db',
                  borderColor: openToFriends ? '#10b981' : '#9ca3af'
                }}
              >
                <div 
                  className="w-5 h-5 bg-white rounded-full shadow-lg absolute top-0.5 transition-all duration-300 ease-in-out"
                  style={{
                    transform: openToFriends ? 'translateX(20px)' : 'translateX(0px)'
                  }}
                ></div>
              </div>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                console.log('Select changed to:', e.target.value);
                updateStatus(e.target.value);
              }}
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
          placeholder="Search by name or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Table aria-label="Friends Table">
          <TableHeader>
            <TableColumn>Name</TableColumn>
            <TableColumn>Email</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn>Game</TableColumn>
            <TableColumn>Mode</TableColumn>
            <TableColumn>Time</TableColumn>
          </TableHeader>
          <TableBody>
            {filteredProfiles.map((profile) => (
              <TableRow key={profile._id}>
                <TableCell>{profile.name}</TableCell>
                <TableCell>{profile.email}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    profile.status === 'Online' ? 'bg-green-100 text-green-800' :
                    profile.status === 'In Game' ? 'bg-blue-100 text-blue-800' :
                    profile.status === 'Away' ? 'bg-yellow-100 text-yellow-800' :
                    profile.status === 'Busy' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.status || 'Offline'}
                  </span>
                </TableCell>
                <TableCell>{profile.game || 'N/A'}</TableCell>
                <TableCell>{profile.mode || 'N/A'}</TableCell>
                <TableCell>{profile.time || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 