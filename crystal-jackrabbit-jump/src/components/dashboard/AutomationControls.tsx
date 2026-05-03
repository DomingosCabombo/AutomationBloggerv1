"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';

const AutomationControls = () => {
  const [isRunning, setIsRunning] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const toggleAutomation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Please log in to control automation.");
      return;
    }

    const newState = !isRunning;
    setIsRunning(newState);
    
    await supabase
      .from('automation_settings')
      .upsert({ user_id: user.id, is_running: newState }, { onConflict: 'user_id' });

    if (newState) {
      showSuccess("Automation engine started successfully.");
    } else {
      showSuccess("Automation engine stopped.");
    }
  };

  const runManual = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Please log in to run manual scrape.");
      return;
    }

    setIsProcessing(true);
    showSuccess("Manual scrape initiated...");

    try {
      const { data, error } = await supabase.functions.invoke('music-automation', {
        body: { action: 'run-scrape', userId: user.id }
      });

      if (error) throw error;
      showSuccess("Manual run completed successfully.");
    } catch (error) {
      console.error("Manual run error:", error);
      showError("An error occurred during manual run.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <div className={`h-1 w-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className={isRunning ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"} size={20} />
          Automation Engine
        </CardTitle>
        <CardDescription>
          Control the background worker that scrapes and processes music.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4">
        <Button 
          size="lg" 
          variant={isRunning ? "destructive" : "default"}
          className="min-w-[160px] gap-2 font-semibold"
          onClick={toggleAutomation}
        >
          {isRunning ? (
            <>
              <Square size={18} fill="currentColor" />
              STOP ENGINE
            </>
          ) : (
            <>
              <Play size={18} fill="currentColor" />
              START ENGINE
            </>
          )}
        </Button>

        <Button 
          size="lg" 
          variant="outline" 
          className="gap-2"
          onClick={runManual}
          disabled={isProcessing}
        >
          <RefreshCw size={18} className={isProcessing ? "animate-spin" : ""} />
          Run Manual Scrape
        </Button>

        <div className="flex-1 flex items-center justify-end">
          <div className="text-right">
            <p className="text-sm font-medium">Next run in:</p>
            <p className="text-2xl font-mono font-bold text-primary">14:52</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutomationControls;