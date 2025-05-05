import React from "react";
import {
  Card,
  CardBody,
  HeroUIProvider,
  Divider,
  CardFooter,
  CardHeader,
  Image,
} from "@heroui/react";
import { Button, ButtonGroup } from "@heroui/button";
import { Spacer } from "@heroui/spacer";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

export default function App() {
  const data = [
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      startTime: "0800",
      endTime: "0900",
    },
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      startTime: "1000",
      endTime: "1100",
    },
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      startTime: "1200",
      endTime: "1300",
    },
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      startTime: "1400",
      endTime: "1500",
    },
    {
      primaryReservation: "Dibyesh Ganguly",
      names: ["Dibyesh Ganguly", "Madhavenshu Dayal", "Rithvik Chavali"],
      startTime: "1600",
      endTime: "1700",
    },
  ];

  function convertMilitaryToStandardTime(militaryTime) {
    const hours = parseInt(militaryTime.slice(0, 2));
    const minutes = parseInt(militaryTime.slice(2, 4));
    let period = hours >= 12 ? "PM" : "AM";
    let standardHours = hours % 12;
    standardHours = standardHours ? standardHours : 12;
    const paddedMinutes = String(minutes).padStart(2, "0");
    return `${standardHours}:${paddedMinutes} ${period}`;
  }

  return (
    <>
      <HeroUIProvider>
        <div className="App" style={{ padding: "20px", width: "50%" }}>
          <Table aria-label="Table with row dividers" className="max-w-md">
            <TableHeader>
              <TableColumn>QUEUE (CONSOLE 1)</TableColumn>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <>
                  <TableRow key={index}>
                    <TableCell>
                      <h2 className="text-bold">
                        <strong>
                          {convertMilitaryToStandardTime(item.startTime)}
                        </strong>
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
          }} isIconOnly
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 20 20">
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </Button>
      </HeroUIProvider>
    </>
  );
}
