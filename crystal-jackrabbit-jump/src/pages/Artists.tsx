"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ArtistManagement from '@/components/dashboard/ArtistManagement';

const Artists = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Artistas</h1>
          <p className="text-indigo-200">Gere a lista de artistas para o motor de automação procurar.</p>
        </div>
        <ArtistManagement />
      </div>
    </DashboardLayout>
  );
};

export default Artists;