import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Button,
} from "@heroui/react";

export default function ProfileTable({ profiles }) {
    const profilesPerPage = 6;
    const [page, setPage] = useState(0);
  
    const totalPages = Math.ceil(profiles.length / profilesPerPage);
  
    const paginatedProfiles = profiles.slice(
      page * profilesPerPage,
      (page + 1) * profilesPerPage
    );
  
    return (
        <div className="w-full max-w-6xl mx-auto">
        {/* Pagination Controls - top right */}
        <div className="flex justify-end items-center mb-2 space-x-8">
          {page > 0 && (
          <Button
            className = "mr-20"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((prev) => prev - 1)}
          >
            ← Prev
          </Button>)}
          {page  < totalPages - 1 && (
            <Button
              className = "mr-20"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next →
            </Button>
          )}
        </div>

        <Table aria-label="User Profiles Table" className="w-full">
          <TableHeader>
            <TableColumn>Name</TableColumn>
            <TableColumn>Email</TableColumn>
            <TableColumn>Game</TableColumn>
            <TableColumn>Mode</TableColumn>
            <TableColumn>Time</TableColumn>
          </TableHeader>
          <TableBody>
            {paginatedProfiles.map((profile, index) => (
              <TableRow key={index}>
                <TableCell>{profile.name}</TableCell>
                <TableCell>{profile.email}</TableCell>
                <TableCell>{profile.game || "N/A"}</TableCell>
                <TableCell>{profile.mode || "N/A"}</TableCell>
                <TableCell>{profile.time || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
  
        
      </div>
    );
  }
  