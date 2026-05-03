"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SloganUpload from '@/components/dashboard/SloganUpload';

const AudioSlogan = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audio Slogans</h1>
          <p className="text-muted-foreground">Upload and manage the audio slogans mixed into your music.</p>
        </div>
        <SloganUpload />
      </div>
    </DashboardLayout>
  );
};

export default AudioSlogan;