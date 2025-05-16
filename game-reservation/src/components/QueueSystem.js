import React, { useState, useEffect } from 'react';
import { useAuth } from '../firebase/AuthContext';
import axios from 'axios';

const QueueSystem = () => {
  const { currentUser } = useAuth();
  const [selectedDevice, setSelectedDevice] = useState('PC');
  const [queueStatus, setQueueStatus] = useState(null);
  const [userQueueStatus, setUserQueueStatus] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchQueueStatus = async () => {
    try {
      setError(null); // Clear any previous errors
      const response = await axios.get(`http://localhost:8080/api/queue/status?deviceType=${selectedDevice}`);
      console.log('Queue status response:', response.data);
      setQueueStatus(response.data);
    } catch (err) {
      console.error('Queue status error:', err);
      setError('Failed to fetch queue status: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchUserQueueStatus = async () => {
    if (!currentUser) return;
    try {
      setError(null); // Clear any previous errors
      const response = await axios.get(`http://localhost:8080/api/queue/user/${currentUser.uid}`);
      console.log('User queue status response:', response.data);
      setUserQueueStatus(response.data);
    } catch (err) {
      console.error('User queue status error:', err);
      setError('Failed to fetch user queue status: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    fetchQueueStatus();
    fetchUserQueueStatus();
    const interval = setInterval(() => {
      fetchQueueStatus();
      fetchUserQueueStatus();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedDevice, currentUser]);

  const handleJoinQueue = async () => {
    if (!currentUser) {
      setError('Please sign in to join the queue');
      return;
    }

    if (!currentUser.uid) {
      setError('User ID is missing. Please try signing out and back in.');
      return;
    }

    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const userData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        deviceType: selectedDevice
      };

      console.log('Attempting to join queue with:', userData);

      const response = await axios.post('http://localhost:8080/api/queue/join', userData);

      console.log('Queue join response:', response.data);
      await fetchUserQueueStatus();
      await fetchQueueStatus();
    } catch (err) {
      console.error('Queue join error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          err.message || 
                          'Failed to join queue';
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!userQueueStatus?._id) return;
    
    try {
      await axios.post('http://localhost:8080/api/queue/complete', {
        queueId: userQueueStatus._id
      });
      fetchUserQueueStatus();
      fetchQueueStatus();
    } catch (err) {
      setError('Failed to complete session');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Gaming Queue System</h2>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Device Type
        </label>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="PC">PC</option>
          <option value="CONSOLE">Console</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Queue Status</h3>
          {queueStatus && (
            <>
              <p className="mb-2">
                Active Users: {queueStatus.activeUsers.length}
              </p>
              <p className="mb-2">
                People in Queue: {queueStatus.queue.length}
              </p>
              <p className="mb-4">
                Estimated Wait Time: {Math.ceil(queueStatus.estimatedWaitTime / 60)} hours
              </p>
            </>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Your Status</h3>
          {userQueueStatus ? (
            <div>
              {userQueueStatus.status === 'WAITING' && (
                <>
                  <p className="mb-2">Position in Queue: {userQueueStatus.position}</p>
                  <p className="mb-4">Estimated Wait: {Math.ceil((userQueueStatus.position - 1) * 2)} hours</p>
                </>
              )}
              {userQueueStatus.status === 'ACTIVE' && (
                <>
                  <p className="mb-2">Your session is active!</p>
                  <p className="mb-2">
                    End Time: {new Date(userQueueStatus.endTime).toLocaleTimeString()}
                  </p>
                  <button
                    onClick={handleCompleteSession}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    End Session
                  </button>
                </>
              )}
            </div>
          ) : (
            <p>You are not in the queue</p>
          )}
        </div>
      </div>

      {!userQueueStatus && (
        <button
          onClick={handleJoinQueue}
          disabled={loading}
          className="mt-6 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {loading ? 'Joining Queue...' : 'Join Queue'}
        </button>
      )}
    </div>
  );
};

export default QueueSystem; 