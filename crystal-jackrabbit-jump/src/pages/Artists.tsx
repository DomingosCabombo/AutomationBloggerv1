"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ArtistManagement from '@/components/dashboard/ArtistManagement';

const Artists = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artists</h1>
          <p className="text-muted-foreground">Manage the list of artists to be processed by the automation engine.</p>
        </div>
        <ArtistManagement />
      </div>
    </DashboardLayout>
  );
};

export default Artists;