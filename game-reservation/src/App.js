import logo from './logo.svg';
import './App.css';
import {HeroUIProvider} from "@heroui/react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue,
} from "@heroui/react";

import {Image} from "@heroui/image";

const rows = [
  {
    key: "1",
    name: "Tony Reichert",
    role: "CEO",
    status: "Active",
  },
  {
    key: "2",
    name: "Zoey Lang",
    role: "Technical Lead",
    status: "Paused",
  },
  {
    key: "3",
    name: "Jane Fisher",
    role: "Senior Developer",
    status: "Active",
  },
  {
    key: "4",
    name: "William Howard",
    role: "Community Manager",
    status: "Vacation",
  },
];

const columns = [
  {
    key: "name",
    label: "TIME",
  },
  {
    key: "role",
    label: "ROLE",
  },
  {
    key: "status",
    label: "STATUS",
  },
];

function App() {
  return (
    <div className="App" style={{padding: "20px"}}>
      <HeroUIProvider>
        <div className="content-center">
          <Table aria-label="Example table with dynamic content">
            <TableHeader columns={columns}>
              {(column) => <TableColumn key={column.key}>{column.label}</TableColumn>}
            </TableHeader>
            <TableBody items={rows}>
              {(item) => (
                <TableRow key={item.key}>
                  {(columnKey) => <TableCell><Image
      alt="HeroUI Image with fallback"
      fallbackSrc="https://via.placeholder.com/300x200"
      height={50}
      src="https://app.requestly.io/delay/1000/https://heroui.com/images/fruit-4.jpeg"
      width={"95%"}
      style={{objectFit: "cover", objectPosition: "center"}}
    /></TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </HeroUIProvider>
    </div>
  );
}

export default App;
