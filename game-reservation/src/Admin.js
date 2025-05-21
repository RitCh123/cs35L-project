"use client";

import React from "react";

import {
  HeroUIProvider,
  Button,
  Link,
  Table,
  TableHeader,
  TableColumn,
  TableCell,
  Chip,
  Spacer,
  TableRow,
  TableBody,
  Card,
  CardBody,
  Divider,
  Avatar,
  SelectItem,
  Select,
  Tab,
} from "@heroui/react";

import { Listbox, ListboxSection, ListboxItem } from "@heroui/react";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownSection,
  DropdownItem,
} from "@heroui/react";

import CustomModal from "./components/CustomModal";

import { useAuth } from "./firebase/AuthContext";

import { useState } from "react";
import { useDisclosure } from "@heroui/react";
import { useEffect } from "react";
import axios from "axios";

import { useNavigate } from 'react-router'

export default function Admin() {
  /// DEFINTE AUXILIARY COMPONENTS

  const navigate = useNavigate();


  const listOfPC = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "Side",
  ];

  const ActionDropdown = ({ isConsole, removeOnClick, onClickConsoleOne, onClickConsoleTwo, onClickPC }) => {
    return (
      <Dropdown>
        <DropdownTrigger>
          <Button variant="bordered">Action</Button>
        </DropdownTrigger>
        <DropdownMenu aria-label="Static Actions">
          {isConsole ? (
            <DropdownSection>
              <DropdownItem key="moveConsoleOne" onClick={() => {
                onClickConsoleOne();
                navigate(0);
              }}>
                Move to Console 1
              </DropdownItem>
              <DropdownItem key="moveConsoleTwo" onClick={onClickConsoleTwo}>
                Move to Console 2
              </DropdownItem>
            </DropdownSection>
          ) : (
            <DropdownSection>
              <DropdownItem key="movePC" onClick={onClickPC}>Move to PC</DropdownItem>
            </DropdownSection>
          )}
          <DropdownItem
            key="delete"
            className="text-danger"
            color="danger"
            onClick={removeOnClick}
          >
            Remove from Queue
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  };

  const { currentUser, logout, userRole } = useAuth();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [data, setData] = useState([]);
  const [selectedConsole, setSelectedConsole] = useState("All PCs");
  const [selectedPC, setSelectedPC] = useState("A");
  const consoleTypes = ["All", "Switch", "Xbox", "PS5"];
  const fetchReservations = () => {
    axios
      .get("http://localhost:8080/api/view/reservations")
      .then((response) => setData(response.data))
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  let priority = 1;
  console.log(data);
  if (data) {
    data.map((item) => {
      item["priority"] = priority;
      priority++;
    });
  }

  const handleDeleteReservation = async (reservationId) => {
    if (!currentUser) return;
    try {
      await axios.delete("http://localhost:8080/api/delete/reservation", {
        data: {
          reservationId,
          userEmail: currentUser.email,
          userRole,
        },
      });
      fetchReservations();
    } catch (err) {
      alert("Failed to delete reservation.");
    }
  };

  return (
    <>
      <HeroUIProvider>
        <nav className="w-full flex items-center justify-between p-4 bg-white">
          <div className="text-xl font-bold">
            <strong>Game Reservation</strong>
          </div>
          <div className="flex gap-2">
            {currentUser ? (
              <>
                <span className="text-gray-600">
                  <Avatar
                    showFallback
                    src="https://images.unsplash.com/broken"
                  />
                </span>
                <Button
                  style={{
                    backgroundImage:
                      "linear-gradient(to top right, #ef4444, #f97316)",
                    color: "white",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  onClick={logout}
                >
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  style={{
                    backgroundImage:
                      "linear-gradient(to top right, #ec4899, #facc15)",
                    color: "white",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  as={Link}
                  href="/signup"
                >
                  Sign Up
                </Button>
                <Button
                  style={{
                    backgroundImage:
                      "linear-gradient(to top right, #ef4444, #f97316)",
                    color: "white",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                  as={Link}
                  href="/login"
                >
                  Log In
                </Button>
              </>
            )}
          </div>
        </nav>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <div className="App" style={{ padding: "20px", width: "50%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
                flexDirection: "row",
                gap: "10px",
              }}
            >
              <Chip color="primary" size="lg">
                Average Time: 8 minutes
              </Chip>
              <Chip color="secondary" size="lg">
                Consoles Available: {2 - (data.filter(item => item.mode === "CONSOLE" && (item.currentConsole === "Console 1" || item.currentConsole === "Console 2")).length)}
              </Chip>
            </div>
            <Spacer y={2} />
            <Table aria-label="Table with row dividers" className="max-w-md">
              <TableHeader>
                <TableColumn>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    QUEUE (CONSOLE)
                  </span>
                </TableColumn>
              </TableHeader>
              <TableBody>
                { data
                  .filter((item) => item.mode === "CONSOLE")
                  .filter(
                    (item) =>
                      item.currentConsole === "Console 1"
                  ).length > 0 ? data
                  .filter((item) => item.mode === "CONSOLE")
                  .filter(
                    (item) =>
                      item.currentConsole === "Console 1"
                  )
                  .map((item, index) => (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell>
                          <h2 className="text-bold">
                            <strong>Console 1</strong>
                          </h2>
                          <Spacer y={2} />
                          <Card>
                            <CardBody>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  <p
                                    className="text-lg"
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    {item.name}
                                  </p>
                                  {item.mode === "CONSOLE" ? (
                                    <p className="text-sm text-gray-500">
                                      Console: {item.consoleType || "Unknown"}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-500">PC</p>
                                  )}
                                </div>
                                <Button
                                  color="danger"
                                  title="Delete"
                                  onClick={() =>
                                    handleDeleteReservation(item._id)
                                  }
                                >
                                  {" "}
                                  Remove
                                </Button>
                              </div>
                            </CardBody>
                          </Card>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )): (
                    <React.Fragment>
                      <TableRow>
                        <TableCell>
                          <h2 className="text-bold">
                            <strong>Console 1</strong>
                          </h2>
                          <Spacer y={2} />
                          <Card>
                            <CardBody>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  <p
                                    className="text-lg"
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      color: "red",
                                    }}
                                  >
                                    No Reservations for Console 1
                                  </p>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )}
                { data
                  .filter((item) => item.mode === "CONSOLE")
                  .filter(
                    (item) =>
                      item.currentConsole === "Console 2"
                  ).length > 0 ? data
                  .filter((item) => item.mode === "CONSOLE")
                  .filter(
                    (item) =>
                      item.currentConsole === "Console 2"
                  )
                  .map((item, index) => (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell>
                          <h2 className="text-bold">
                            <strong>Console 2</strong>
                          </h2>
                          <Spacer y={2} />
                          <Card>
                            <CardBody>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  <p
                                    className="text-lg"
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    {item.name}
                                  </p>
                                  {item.mode === "CONSOLE" ? (
                                    <p className="text-sm text-gray-500">
                                      Console: {item.consoleType || "Unknown"}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-500">PC</p>
                                  )}
                                </div>
                                <Button
                                  color="danger"
                                  title="Delete"
                                  onClick={() =>
                                    handleDeleteReservation(item._id)
                                  }
                                >
                                  {" "}
                                  Remove
                                </Button>
                              </div>
                            </CardBody>
                          </Card>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )): (
                    <React.Fragment>
                      <TableRow>
                        <TableCell>
                          <h2 className="text-bold">
                            <strong>Console 2</strong>
                          </h2>
                          <Spacer y={2} />
                          <Card>
                            <CardBody>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  <p
                                    className="text-lg"
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      color: "red",
                                    }}
                                  >
                                    No Reservations for Console 2
                                  </p>
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )}
                  <TableRow>
                    <TableCell colSpan={1} className="h-auto py-0">
                      <Divider className="my-0" />
                    </TableCell>
                  </TableRow>
                  
                { data
                  .filter((item) => item.mode === "CONSOLE")
                  .filter(
                    (item) =>
                      item.currentConsole === null
                  )
                  .map((item, index) => (
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell>
                          <h2 className="text-bold">
                            <strong>Priority #{index + 1}</strong>
                          </h2>
                          <Spacer y={2} />
                          <Card>
                            <CardBody>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                >
                                  <p
                                    className="text-lg"
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    {item.name}
                                  </p>
                                  {item.mode === "CONSOLE" ? (
                                    <p className="text-sm text-gray-500">
                                      Console: {item.consoleType || "Unknown"}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-500">PC</p>
                                  )}
                                </div>
                                <ActionDropdown 
                                  isConsole={true} 
                                  removeOnClick={() =>
                                    handleDeleteReservation(item._id)
                                  }
                                  onClickConsoleOne={
                                    async () => {
                                      try {
                                        await axios.post(
                                          "http://localhost:8080/api/move/console/reservation",
                                          {
                                            reservationId: item._id,
                                            currentConsole: "Console 1",
                                          }
                                        )
                                      } catch (error) {
                                        console.error("Error moving reservation:", error);
                                      }
                                    }
                                  }
                                  onClickConsoleTwo={
                                    async () => {
                                      try {
                                        await axios.post(
                                          "http://localhost:8080/api/move/reservation",
                                          {
                                            reservationId: item._id,
                                            currentConsole: "Console 2",
                                          }
                                        )
                                      } catch (error) {
                                        console.error("Error moving reservation:", error);
                                      }
                                    }
                                  }
                                />
                              </div>
                            </CardBody>
                          </Card>
                          <Spacer y={2} />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={1} className="h-auto py-0">
                          <Divider className="my-0" />
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                ;
              </TableBody>
            </Table>
          </div>
          <div className="App" style={{ padding: "20px", width: "50%" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                alignItems: "center",
                flexDirection: "row",
                gap: "10px",
              }}
            >
              <Chip color="primary" size="lg">
                Average Time: 8 minutes
              </Chip>
              <Chip color="secondary" size="lg">
                PCs Available: {14 - (data.filter(item => item.mode === "PC" && item.onCurrentPC === true).length)}
              </Chip>
            </div>
            <Spacer y={2} />
            <Table aria-label="Table with row dividers" className="max-w-md">
              <TableHeader>
                <TableColumn>QUEUE (PC)</TableColumn>
                <TableColumn>
                  <Select
                    className="bg-gray-100 text-xs px-2 py-1 rounded"
                    style={{
                      background: "#f9fafb", // matches typical table header bg
                      fontSize: "0.75rem",
                      height: "1.5rem",
                      minWidth: "80px",
                      border: "none",
                      boxShadow: "none",
                    }}
                    size="sm"
                    aria-label="PC Filter"
                    placeholder="All PCs"
                    onChange={(e) => {
                      setSelectedPC(e.target.value);
                    }}
                    value={selectedPC}
                    defaultSelectedKeys={["A"]}
                  >
                    {listOfPC.map((pc) => (
                      <SelectItem key={pc} value={pc}>
                        {pc}
                      </SelectItem>
                    ))}
                  </Select>
                </TableColumn>
              </TableHeader>
              <TableBody>
                {data
                .filter((item) => item.mode === "PC" && item.pcLetter === selectedPC && item.onCurrentPC === true).length > 0 ? data
                .filter((item) => item.mode === "PC" && item.pcLetter === selectedPC && item.onCurrentPC === true)
                .map((item, index) => (
                  <TableRow>
                    <TableCell colSpan={2} className="h-auto py-0">
                      <h2 className="text-bold">
                        <strong>PC {selectedPC}</strong>
                      </h2>
                      <Spacer y={2} />
                      <Card>
                        <CardBody>
                          <div
                            style={{
                              display: "flex",
                              gap: "1rem",
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <p
                                className="text-lg"
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                {item.name}
                              </p>
                            </div>
                            <Button
                              color="danger"
                              title="Delete"
                              onClick={() =>
                                handleDeleteReservation(item._id)
                              }
                            >
                              {" "}
                              Remove
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    </TableCell>
                </TableRow>
                )): (
                  <TableRow>
                    <TableCell colSpan={2} className="h-auto py-0">
                      <h2 className="text-bold">
                        <strong>PC {selectedPC}</strong>
                      </h2>
                      <Spacer y={2} />
                      <Card>
                        <CardBody>
                          <div
                            style={{
                              display: "flex",
                              gap: "1rem",
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <p
                                className="text-lg"
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  color: "red",
                                }}
                              >
                                No Reservations for PC {selectedPC}
                              </p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </TableCell>
                  </TableRow>
                )}
                <TableRow>
                  <TableCell colSpan={2} className="h-auto py-0">
                    <Spacer y={2} />
                    <Divider className="my-0" />
                    <Spacer y={2} />
                  </TableCell>
                </TableRow>
                {data
                .filter((item) => item.mode === "PC" && item.pcLetter === selectedPC && item.onCurrentPC === false)
                .map((item, index) => (
                  <TableRow>
                    <TableCell colSpan={2} className="h-auto py-0">
                      <h2 className="text-bold">
                        <strong>Priority #{index + 1}</strong>
                      </h2>
                      <Spacer y={2} />
                      <Card>
                        <CardBody>
                          <div
                            style={{
                              display: "flex",
                              gap: "1rem",
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                              }}
                            >
                              <p
                                className="text-lg"
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                {item.name}
                              </p>
                            </div>
                            <ActionDropdown 
                              isConsole={false} 
                              removeOnClick={() =>
                                handleDeleteReservation(item._id)
                              }
                              onClickPC={
                                async () => {
                                  try {
                                    await axios.post(
                                      "http://localhost:8080/api/move/pc/reservation",
                                      {
                                        reservationId: item._id,
                                        pcLetter: selectedPC,
                                        onCurrentPC: true,
                                      }
                                    )
                                  } catch (error) {
                                    console.error("Error moving reservation:", error);
                                  }
                                }
                              }
                            />
                          </div>
                        </CardBody>
                      </Card>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <Button
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "24px",
            backgroundColor: "#ff5e5e",
          }}
          isIconOnly
          onPress={onOpen}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
            <path
              d="M10 4v12M4 10h12"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Button>
        <CustomModal
          isOpen={isOpen}
          placement="top-center"
          onOpenChange={onOpenChange}
          onReservationCreated={fetchReservations}
          renderInput={true}
        />
      </HeroUIProvider>
    </>
  );
}
