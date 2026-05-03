"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Terminal } from 'lucide-react';

interface LogEntry {
  id: string;
  level: string;
  message: string;
  created_at: string;
}

const Logs = () => {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);

  React.useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (data) setLogs(data);
    };

    fetchLogs();

    // Opcional: ouvir por novos logs em tempo real se a tabela estiver configurada
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'logs',
        },
        (payload) => {
          setLogs((current) => [payload.new as LogEntry, ...current].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'destructive';
      case 'success': return 'default';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registo de Atividades (Logs)</h1>
            <p className="text-muted-foreground">Monitoriza o que a Inteligência Artificial está a fazer em tempo real.</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-green-400 rounded-lg text-sm font-mono shadow-sm">
            <Terminal size={16} />
            Sistema Ativo
          </div>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">Eventos do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Data & Hora</TableHead>
                  <TableHead className="w-[120px]">Nível</TableHead>
                  <TableHead>Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Ainda não há registos disponíveis no sistema.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm font-medium text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBadgeColor(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.message}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Logs;
