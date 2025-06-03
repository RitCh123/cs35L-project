import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";

export default function ProfileTable({ profiles }) {
  const profilesPerPage = 6;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(profiles.length / profilesPerPage);
  const paginatedProfiles = profiles.slice(
    page * profilesPerPage,
    (page + 1) * profilesPerPage
  );

  return (
    <div>
      {/* Pagination Controls - top right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.5rem', gap: '1rem' }}>
        <button
          style={{ marginRight: 20 }}
          disabled={page === 0}
          onClick={() => setPage((prev) => prev - 1)}
        >
          ← Prev
        </button>
        <button
          style={{ marginRight: 20 }}
          disabled={page >= totalPages - 1}
          onClick={() => setPage((prev) => prev + 1)}
        >
          Next →
        </button>
      </div>
    <Table aria-label="User profiles">
      <TableHeader> 
        <TableColumn>NAME</TableColumn>
        <TableColumn>EMAIL</TableColumn>
          <TableColumn>GAME</TableColumn>
          <TableColumn>MODE</TableColumn>
          <TableColumn>TIME</TableColumn>
      </TableHeader>
      <TableBody>
          {paginatedProfiles.map((profile, index) => (
            <TableRow key={profile._id || index}>
            <TableCell>{profile.name}</TableCell>
            <TableCell>{profile.email}</TableCell>
              <TableCell>{profile.game || 'N/A'}</TableCell>
              <TableCell>{profile.mode || 'N/A'}</TableCell>
              <TableCell>{profile.time || 'N/A'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}  