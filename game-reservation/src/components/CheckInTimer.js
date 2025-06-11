import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Progress } from "@nextui-org/react";

export default function CheckInTimer({ 
  isOpen, 
  onClose, 
  deadline, 
  onTimeout,
  reservationId,
  reservationType
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(100);
  const totalTime = 10 * 60; // 10 minutes in seconds

  useEffect(() => {
    if (!deadline || !isOpen) return;

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const deadlineTime = new Date(deadline).getTime();
      const difference = deadlineTime - now;
      
      if (difference <= 0) {
        onTimeout();
        return 0;
      }
      
      const secondsLeft = Math.floor(difference / 1000);
      const progressPercent = (secondsLeft / totalTime) * 100;
      
      setTimeLeft(secondsLeft);
      setProgress(Math.max(0, Math.min(100, progressPercent)));
      
      return secondsLeft;
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [deadline, isOpen, onTimeout]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isDismissable={false} hideCloseButton>
      <ModalContent>
        <ModalHeader>Check-In Required</ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            <p>Your {reservationType} reservation is now active! Please check in with an admin within:</p>
            <div className="text-center">
              <span className="text-2xl font-bold">{formatTime(timeLeft)}</span>
            </div>
            <Progress 
              value={progress} 
              color={progress > 50 ? "success" : progress > 20 ? "warning" : "danger"}
              className="w-full"
            />
            <p className="text-sm text-gray-500">
              Note: Your reservation will be automatically cancelled if you don't check in with an admin before the timer expires.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <p className="text-sm text-gray-600">Please find an admin to check in.</p>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 