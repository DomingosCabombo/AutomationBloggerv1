"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, Cloud, FileText, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const StatsCards = () => {
  const [stats, setStats] = React.useState([
    { title: "Total Artists", value: "0", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Processed Posts", value: "0", icon: FileText, color: "text-orange-500", bg: "bg-orange-500/10" },
    { title: "Files in Drive", value: "0", icon: Cloud, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Recent Logs", value: "0", icon: Music, color: "text-green-500", bg: "bg-green-500/10" }
  ]);

  React.useEffect(() => {
    const fetchStats = async () => {
      const [artists, posts, files, logs] = await Promise.all([
        supabase.from('artists').select('*', { count: 'exact', head: true }),
        supabase.from('processed_posts').select('*', { count: 'exact', head: true }),
        supabase.from('files').select('*', { count: 'exact', head: true }),
        supabase.from('logs').select('*', { count: 'exact', head: true })
      ]);

      setStats([
        { title: "Total Artists", value: (artists.count || 0).toString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
        { title: "Processed Posts", value: (posts.count || 0).toString(), icon: FileText, color: "text-orange-500", bg: "bg-orange-500/10" },
        { title: "Files in Drive", value: (files.count || 0).toString(), icon: Cloud, color: "text-purple-500", bg: "bg-purple-500/10" },
        { title: "System Logs", value: (logs.count || 0).toString(), icon: Music, color: "text-green-500", bg: "bg-green-500/10" }
      ]);
    };

    fetchStats();
    
    // Subscribe to changes to keep stats live
    const channels = [
      supabase.channel('stats-artists').on('postgres_changes', { event: '*', schema: 'public', table: 'artists' }, fetchStats).subscribe(),
      supabase.channel('stats-posts').on('postgres_changes', { event: '*', schema: 'public', table: 'processed_posts' }, fetchStats).subscribe(),
      supabase.channel('stats-files').on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, fetchStats).subscribe(),
      supabase.channel('stats-logs').on('postgres_changes', { event: '*', schema: 'public', table: 'logs' }, fetchStats).subscribe()
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`${stat.bg} p-2 rounded-lg`}>
              <stat.icon className={`${stat.color}`} size={18} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;