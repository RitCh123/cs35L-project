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

  return (
    <Card className="flex-1">
      <CardHeader style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#4338ca' }}>{title}</h2>
          <div>
            <Chip color="success" size="md">
              Active {stationType}s: {maxCount - activeCount} / {maxCount}
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
              {activeReservations.length === 0 && (
                <p style={{ color: '#4b5563' }}>No active {stationType.toLowerCase()} sessions.</p>
              )}
              <Accordion variant="splitted" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeReservations.map((item, index) => {
                  // Only show active sessions to admins or the user themselves
                  if (!canSeeFullDetails(item)) return null;

                  return (
                    <AccordionItem
                      key={item._id}
                      aria-label={`${item.name}'s Reservation`}
                      style={{ marginBottom: '1rem' }}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '1rem' }}>
                          <p style={{ fontWeight: '600' }}>{item.name}</p>
                          {canSeeFullDetails(item) && (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                              {userRole === 'ADMIN' && (
                                <Button
                                  size="md"
                                  color="success"
                                  variant="ghost"
                                  onPress={() => onComplete(item._id)}
                                  style={{
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                  }}
                                >
                                  Complete
                                </Button>
                              )}
                              <Button
                                size="md"
                                color="danger"
                                variant="ghost"
                                onPress={() => onDelete(item._id)}
                                style={{
                                  padding: '0.75rem 1.5rem',
                                  fontSize: '0.875rem',
                                  fontWeight: '500'
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          )}
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
                            hour12: true // Set to true for 12-hour format
                          }) : "N/A"}
                        </p>
                      </div>
                    </AccordionItem>
                  );
                })}
              </Accordion>
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
              <Accordion variant="splitted" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {waitlistedReservations.map((item, index) => (
                  <AccordionItem
                    key={item._id}
                    aria-label={`${canSeeFullDetails(item) ? item.name : getPlaceholderName(index)}'s Waitlist Entry`}
                    style={{ marginBottom: '1rem' }}
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '1rem' }}>
                        <p style={{ fontWeight: '600' }}>
                          #{index + 1}: {canSeeFullDetails(item) ? item.name : getPlaceholderName(index)}
                        </p>
                        {canSeeFullDetails(item) && (
                          <Button
                            size="md"
                            color="danger"
                            variant="ghost"
                            onPress={() => onDelete(item._id)}
                            style={{
                              padding: '0.75rem 1.5rem',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    }
                  >
                    <div style={{ padding: '1rem 0.5rem' }}>
                      {canSeeFullDetails(item) ? (
                        <>
                          <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Email: {item.email}</p>
                          {stationType === "PC" ? (
                            <>
                              <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Party Size: {item.partySize}</p>
                              <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Seat Together: {item.seatTogether ? "Yes" : "No"}</p>
                              <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Game: {item.preferredGame || "Any"}</p>
                            </>
                          ) : (
                            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>Console: {item.consoleType}</p>
                          )}
                          <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                            Status: <Chip size="sm" color="default">{item.status}</Chip>
                          </p>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                            Queued at: {new Date(item.createdAt).toLocaleTimeString()}
                          </p>
                          {item.notes && (
                            <p style={{ fontSize: '0.75rem', color: '#f97316' }}>Notes: {item.notes}</p>
                          )}
                        </>
                      ) : (
                        <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                          Queued at: {new Date(item.createdAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default DisplayTypeStation; 