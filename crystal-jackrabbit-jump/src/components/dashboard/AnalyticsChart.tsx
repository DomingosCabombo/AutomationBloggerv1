import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, parseISO } from 'date-fns';
import { Loader2, TrendingUp } from 'lucide-react';

const AnalyticsChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Generate last 7 days array
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        return {
          date: format(d, 'yyyy-MM-dd'),
          displayDate: format(d, 'dd MMM'),
          processed: 0
        };
      });

      // 2. Fetch real data from processed_posts
      const { data: posts, error } = await supabase
        .from('processed_posts')
        .select('created_at')
        .gte('created_at', subDays(new Date(), 7).toISOString());

      if (!error && posts && posts.length > 0) {
        // Group by date
        const grouped = posts.reduce((acc: any, post: any) => {
          const dateStr = format(parseISO(post.created_at), 'yyyy-MM-dd');
          acc[dateStr] = (acc[dateStr] || 0) + 1;
          return acc;
        }, {});

        // Merge with our 7-day array
        const mergedData = last7Days.map(day => ({
          ...day,
          processed: grouped[day.date] || 0
        }));
        
        setData(mergedData);
      } else {
        // Mock data for new users so the dashboard doesn't look empty
        // This is a psychological trick to show the system's potential
        const mockData = last7Days.map((day, i) => ({
          ...day,
          processed: [0, 2, 5, 3, 8, 12, 15][i] // Fictitious rising trend
        }));
        setData(mockData);
      }
      
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-md h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </Card>
    );
  }

  // Check if we are using mock data
  const isMock = data.reduce((sum, item) => sum + item.processed, 0) > 0 && 
                 data[6].processed === 15; // Simple check based on our mock data

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden relative group">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl text-white font-bold flex items-center gap-2">
              <TrendingUp className="text-indigo-400" size={20} />
              Volume de Extração Semanal
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              Músicas processadas e publicadas nos últimos 7 dias.
            </CardDescription>
          </div>
          {isMock && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full animate-pulse">
              Modo Demonstração
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorProcessed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                stroke="#64748b" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                itemStyle={{ color: '#818cf8' }}
              />
              <Area 
                type="monotone" 
                dataKey="processed" 
                name="Músicas Publicadas"
                stroke="#818cf8" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorProcessed)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsChart;
