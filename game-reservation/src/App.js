import React, { useEffect, useState } from "react";
import { useAuth } from "./firebase/AuthContext";

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
  const { currentUser, logout, userRole } = useAuth();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8080/api/view/reservations")
      .then((response) => response)
      .then((data) => {
        setData(data.data);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
      });
  }, []);

  let priority = 1;
  console.log(data)
  if (data) {
    data.map((item) => {
      item["priority"] = priority;
      priority++;
    });
  }

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
                <span className="text-gray-600">Welcome, {userRole}</span>
                <Button
                  style={{
                    backgroundImage: "linear-gradient(to top right, #ef4444, #f97316)",
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
                    backgroundImage: "linear-gradient(to top right, #ec4899, #facc15)",
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
                    backgroundImage: "linear-gradient(to top right, #ef4444, #f97316)",
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
                Consoles Available: 2
              </Chip>
            </div>
            <Spacer y={2} />
            <Table aria-label="Table with row dividers" className="max-w-md">
              <TableHeader>
                <TableColumn>QUEUE (CONSOLE)</TableColumn>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <>
                    <TableRow key={index}>
                      <TableCell>
                        <h2 className="text-bold">
                          <strong>Priority #{item.priority}</strong>
                        </h2>
                        <Spacer y={2} />
                        <Card>
                          <CardBody>
                            <p className="text-lg">{item.name}</p>
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
                  </>
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
                PCs Available: 25
              </Chip>
            </div>
            <Spacer y={2} />
            <Table aria-label="Table with row dividers" className="max-w-md">
              <TableHeader>
                <TableColumn>QUEUE (PC)</TableColumn>
              </TableHeader>
              <TableBody>
                {data.map((item, index) => (
                  <>
                    <TableRow key={index}>
                      <TableCell>
                        <h2 className="text-bold">
                          <strong>Priority #{item.priority}</strong>
                        </h2>
                        <Spacer y={2} />
                        <Card>
                          <CardBody>
                            <p className="text-lg">{item.name}</p>
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
                  </>
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
        />
      </HeroUIProvider>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
