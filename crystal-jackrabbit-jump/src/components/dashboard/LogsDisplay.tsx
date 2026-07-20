"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  created_at: string;
  level: string;
  message: string;
}

const LogsDisplay = () => {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('logs')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (data) setLogs(data);
  };

  React.useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('logs_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, (payload) => {
        setLogs((prev) => [...prev, payload.new as LogEntry].slice(-100));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const clearLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('logs').delete().eq('user_id', user.id);
      setLogs([]);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-blue-400';
    }
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-lg shadow-black/20 text-slate-50">
      <CardHeader className="flex flex-row items-center justify-between border-b border-white/10 py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-300">
          <TerminalIcon size={16} />
          Registos do Sistema (Logs)
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-50" onClick={clearLogs}>
          <Trash2 size={14} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={scrollRef}
          className="h-[300px] overflow-y-auto p-4 font-mono text-xs space-y-1 scrollbar-thin scrollbar-thumb-slate-800"
        >
          {logs.length === 0 ? (
            <div className="text-slate-500 italic">No logs to display...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-3">
                <span className="text-slate-500 shrink-0">
                  [{format(new Date(log.created_at), 'HH:mm:ss')}]
                </span>
                <span className={`${getLevelColor(log.level)} uppercase shrink-0 w-16`}>{log.level}</span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LogsDisplay;