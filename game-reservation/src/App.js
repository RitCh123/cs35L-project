import React, { useEffect, useState } from "react";
import { useAuth } from "./firebase/AuthContext";

import { Avatar, AvatarIcon } from "@heroui/react";

import { useNavigate }  from "react-router-dom";

// Import bulk dependencies based on need

import {
  Card,
  CardBody,
  HeroUIProvider,
  Divider,
  CardFooter,
  CardHeader,
  Image,
  useDisclosure,
  Select,
  SelectItem
} from "@heroui/react";

import { Chip } from "@heroui/react";

import { Button, ButtonGroup } from "@heroui/button";

import { Spacer } from "@heroui/spacer";

import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/react";

import { Link } from "@heroui/react";

import axios from "axios";


import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

import CustomModal from "./components/CustomModal";

function AppContent() {
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
    "N",
  ];
  const [selectedPC, setSelectedPC] = useState("A");

  const navigate = useNavigate();
  const { currentUser, logout, userRole } = useAuth();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [data, setData] = useState([]);
  const [selectedConsole, setSelectedConsole] = useState("All");
  const consoleTypes = ["All", "Switch", "Xbox", "PS5"];

  const fetchReservations = () => {
    axios.get("http://localhost:8080/api/view/reservations")
      .then((response) => setData(response.data))
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  };

  useEffect(() => {
    if (userRole === "ADMIN") {
      navigate("/admin");
    }
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
                  {userRole === 'ADMIN'
                    ? 'Welcome, Admin!'
                    : 'Welcome, User!'}
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    QUEUE (CONSOLE)
                  </span>
                </TableColumn>
              </TableHeader>
              <TableBody>
                {data
                  .filter(item => item.mode === "CONSOLE")
                  .filter((item =>(selectedConsole === "All" || item.consoleType === selectedConsole) && item.currentConsole === null))
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
                              <p className="text-lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {item.name}
                                {(userRole === 'ADMIN' || (currentUser && item.name === (currentUser.displayName || currentUser.email))) && (
                                  <span
                                    style={{ color: '#ef4444', cursor: 'pointer', marginLeft: '1rem', fontWeight: 'bold', fontSize: '1.2em' }}
                                    title="Delete"
                                    onClick={() => handleDeleteReservation(item._id)}
                                  >
                                    ×
                                  </span>
                                )}
                              </p>
                              {item.mode === 'CONSOLE' ? (
                                <p className="text-sm text-gray-500">
                                  Console: {item.consoleType || "Unknown"}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-500">PC</p>
                              )}
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
                PCs Available: {14 - data.filter(item => item.mode === "PC" && item.onCurrentPC === true).length}
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
                {data.filter(item => item.mode === "PC" && item.pcLetter === selectedPC && item.onCurrentPC === false).map((item, index) => (
                  <React.Fragment key={index}>
                    <TableRow>
                      <TableCell>
                        <h2 className="text-bold">
                          <strong>Priority #{index + 1}</strong>
                        </h2>
                        <Spacer y={2} />
                        <Card>
                          <CardBody>
                            <p className="text-lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              {item.name}
                              {(userRole === 'ADMIN' || (currentUser && item.email === currentUser.email)) && (
                                <span
                                  style={{ color: '#ef4444', cursor: 'pointer', marginLeft: '1rem', fontWeight: 'bold', fontSize: '1.2em' }}
                                  title="Delete"
                                  onClick={() => handleDeleteReservation(item._id)}
                                >
                                  ×
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">PC</p>
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
        />
      </HeroUIProvider>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
