import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Divider,
  Accordion,
  AccordionItem
} from "@heroui/react";

// UCLA-themed placeholder names
const placeholderNames = [
  "Bruin Bear",
  "Joe Bruin",
  "Josie Bruin",
  "Powell Cat",
  "Royce Hall",
  "Powell Library",
  "Janss Steps",
  "Wooden Center",
  "Ackerman Union",
  "Sproul Student",
  "Hedrick Scholar",
  "Rieber Resident",
  "Covel Commons",
  "Drake Runner",
  "Pauley Player"
];

const getPlaceholderName = (index) => {
  return placeholderNames[index % placeholderNames.length];
};

const DisplayTypeStation = ({
  title,
  activeCount,
  maxCount,
  waitlistCount,
  activeReservations,
  waitlistedReservations,
  userRole,
  currentUser,
  onComplete,
  onDelete,
  stationType,
  isAdminView
}) => {
  // Function to check if user can see full reservation details
  const canSeeFullDetails = (reservation) => {
    return userRole === 'ADMIN' || (currentUser && currentUser.email === reservation.email);
  };

  // Function to check if a reservation is expired
  const isReservationExpired = (reservation) => {
    if (!reservation.endTime) return false;
    const now = new Date();
    const endTime = new Date(reservation.endTime);
    return endTime < now;
  };

  // Filter out expired reservations
  const filteredActiveReservations = activeReservations.filter(res => !isReservationExpired(res));
  
  // Calculate total occupied slots based on party sizes for PCs
  const totalOccupiedSlots = filteredActiveReservations.reduce((total, res) => {
    if (stationType === "PC") {
      return total + (res.partySize || 1); // Use party size for PCs
    }
    return total + 1; // Console reservations always count as 1
  }, 0);

  // Calculate available slots
  const availableSlots = maxCount - totalOccupiedSlots;

  return (
    <Card className="flex-1">
      <CardHeader style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#4338ca' }}>{title}</h2>
          <div>
            <Chip color="success" size="md">
              Available {stationType}s: {availableSlots} / {maxCount}
            </Chip>
            <Chip color="warning" size="md" style={{ marginLeft: '0.5rem' }}>
              {stationType} Waitlist: {waitlistCount}
            </Chip>
          </div>
        </div>
      </CardHeader>
      <Divider />
      <CardBody style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '500',
              marginBottom: '1.5rem',
              color: '#1f2937'
            }}>
              Active {stationType} Sessions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filteredActiveReservations.length === 0 && (
                <p style={{ color: '#4b5563' }}>No active {stationType.toLowerCase()} sessions.</p>
              )}
              {filteredActiveReservations.map((item, index) => (
                canSeeFullDetails(item) ? (
                  <Accordion key={item._id} variant="splitted">
                    <AccordionItem
                      key={item._id}
                      aria-label={`${item.name}'s Reservation`}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '1rem' }}>
                          <p style={{ fontWeight: '600' }}>{item.name}</p>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {userRole === 'ADMIN' && (
                              <Button
                                size="md"
                                color="success"
                                variant="ghost"
                                onPress={() => onComplete(item._id)}
                              >
                                Complete
                              </Button>
                            )}
                            <Button
                              size="md"
                              color="danger"
                              variant="ghost"
                              onPress={() => onDelete(item._id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      }
                    >
                      <div style={{ padding: '1rem 0.5rem' }}>
                        <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Email: {item.email}</p>
                        {stationType === "PC" ? (
                          <>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Party Size: {item.partySize}</p>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Seat Together: {item.seatTogether ? "Yes" : "No"}</p>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Game: {item.preferredGame || "Any"}</p>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Party Members: {item.partyMembers?.slice(1).join(', ') || 'None'}</p>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                              Assigned: {item.assignedPCs && item.assignedPCs.length > 0
                                ? item.assignedPCs.join(', ')
                                : "Pending assignment"}
                            </p>
                          </>
                        ) : (
                          <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Console: {item.consoleType}</p>
                        )}
                        <p style={{ fontSize: '0.875rem', color: '#059669', fontWeight: '500' }}>
                          Ends: {item.endTime ? new Date(item.endTime).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : "N/A"}
                        </p>
                      </div>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  <Card key={item._id} style={{ marginBottom: '0.5rem' }}>
                    <CardBody style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: '600' }}>{getPlaceholderName(index)}</p>
                          <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                            Ends: {item.endTime ? new Date(item.endTime).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            }) : "N/A"}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              ))}
            </div>
          </div>

          <Divider style={{ margin: '1rem 0' }} />

          <div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '500',
              marginBottom: '1.5rem',
              color: '#1f2937'
            }}>
              {stationType} Waitlist
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {waitlistedReservations.length === 0 && (
                <p style={{ color: '#4b5563' }}>{stationType} waitlist is empty.</p>
              )}
              {waitlistedReservations.map((item, index) => (
                canSeeFullDetails(item) ? (
                  <Accordion key={item._id} variant="splitted">
                    <AccordionItem
                      key={item._id}
                      aria-label={`${item.name}'s Waitlist Entry`}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '1rem' }}>
                          <p style={{ fontWeight: '600' }}>#{index + 1}: {item.name}</p>
                          <Button
                            size="md"
                            color="danger"
                            variant="ghost"
                            onPress={() => onDelete(item._id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      }
                    >
                      <div style={{ padding: '1rem 0.5rem' }}>
                        <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Email: {item.email}</p>
                        {stationType === "PC" ? (
                          <>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Party Size: {item.partySize}</p>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Seat Together: {item.seatTogether ? "Yes" : "No"}</p>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Game: {item.preferredGame || "Any"}</p>
                            {item.partyMembers && item.partyMembers.length > 1 && (
                              <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                                Party Members: {item.partyMembers.slice(1).join(', ')}
                              </p>
                            )}
                          </>
                        ) : (
                          <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Console: {item.consoleType}</p>
                        )}
                        <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                          Status: <Chip size="sm" color="warning">Waitlisted</Chip>
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                          Queued at: {new Date(item.createdAt).toLocaleTimeString()}
                        </p>
                        {item.notes && (
                          <p style={{ fontSize: '0.75rem', color: '#f97316' }}>Notes: {item.notes}</p>
                        )}
                      </div>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  <Card key={item._id} style={{ marginBottom: '0.5rem' }}>
                    <CardBody style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: '600' }}>#{index + 1}: {getPlaceholderName(index)}</p>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            Queued at: {new Date(item.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )
              ))}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default DisplayTypeStation; 