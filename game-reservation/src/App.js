import React from "react";

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

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

import CustomModal from "./components/CustomModal";

export default function App() {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const data = [
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      startTime: "0800",
      endTime: "0900",
      priority: 1,
    },
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      startTime: "1000",
      endTime: "1100",
      priority: 2,
    },
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      startTime: "1200",
      endTime: "1300",
      priority: 3,
    },
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      priority: 4,
    },
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      priority: 5,
    },
  ];

  return (
    <>
      <HeroUIProvider>
        <nav className="w-full flex items-center justify-between p-4 bg-white">
          <div className="text-xl font-bold">
            <strong>Game Reservation</strong>
          </div>
          <div className="flex gap-2">
            <Button
              style={{
                backgroundImage:
                  "linear-gradient(to top right, #ec4899, #facc15)", // pink-500 to yellow-500
                color: "white",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
              as={Link}
              href="/login"
            >
              Sign In
            </Button>
            <Button
              style={{
                backgroundImage:
                  "linear-gradient(to top right, #ef4444, #f97316)", // red-500 to orange-500
                color: "white",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
              as={Link}
              href="/login"
            >
              Log In
            </Button>
          </div>
        </nav>
        <div style={{display: "flex", justifyContent: "space-around"}}>
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
                            <p className="text-lg">{item.primaryReservation}</p>
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
                PCs Available: 2
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
                            <p className="text-lg">{item.primaryReservation}</p>
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
