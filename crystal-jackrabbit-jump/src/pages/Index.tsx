"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AutomationControls from '@/components/dashboard/AutomationControls';
import LogsDisplay from '@/components/dashboard/LogsDisplay';
import StatsCards from '@/components/dashboard/StatsCards';
import AnalyticsChart from '@/components/dashboard/AnalyticsChart';

const Index = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">Central de Comando</h1>
          <p className="text-indigo-200 text-lg">Monitoriza e controla a tua automação musical em tempo real.</p>
        </div>

        <StatsCards />

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <AnalyticsChart />
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