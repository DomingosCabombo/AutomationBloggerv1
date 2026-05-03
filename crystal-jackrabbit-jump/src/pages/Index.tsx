"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AutomationControls from '@/components/dashboard/AutomationControls';
import LogsDisplay from '@/components/dashboard/LogsDisplay';
import StatsCards from '@/components/dashboard/StatsCards';

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">Monitor your music automation system in real-time.</p>
        </div>

        <StatsCards />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <AutomationControls />
          </div>

          <div className="space-y-8">
            <LogsDisplay />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;