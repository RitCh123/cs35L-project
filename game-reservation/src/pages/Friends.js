import React, { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import axios from 'axios';

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
        <h1 className="text-2xl font-bold">Friends</h1>
        <div className="flex items-center gap-12">
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Game
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mode
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProfiles.map((profile) => (
              <tr key={profile._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {profile.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {profile.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    profile.status === 'Online' ? 'bg-green-100 text-green-800' :
                    profile.status === 'In Game' ? 'bg-blue-100 text-blue-800' :
                    profile.status === 'Away' ? 'bg-yellow-100 text-yellow-800' :
                    profile.status === 'Busy' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.status || 'Offline'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {profile.game || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {profile.mode || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {profile.time || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 