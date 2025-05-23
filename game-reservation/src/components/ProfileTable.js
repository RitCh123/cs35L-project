import React from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

export default function ProfileTable({ profiles }) {
  return (
    <Table aria-label="User profiles">
      <TableHeader>
        <TableColumn>NAME</TableColumn>
        <TableColumn>EMAIL</TableColumn>
        <TableColumn>STATUS</TableColumn>
      </TableHeader>
      <TableBody>
        {profiles.map((profile) => (
          <TableRow key={profile._id}>
            <TableCell>{profile.name}</TableCell>
            <TableCell>{profile.email}</TableCell>
            <TableCell>{profile.status || 'Offline'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
} 