"use client";

import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, MoreHorizontal, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ProcessedPost {
  id: string;
  artist: string;
  title: string;
  source_url: string;
  processed_at: string;
  cover_url?: string;
  blogger_url?: string;
}

const History = () => {
  const [posts, setPosts] = React.useState<ProcessedPost[]>([]);
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    const fetchPosts = async () => {
      let query = supabase
        .from('processed_posts')
        .select('*')
        .order('processed_at', { ascending: false });
      
      if (search) {
        query = query.or(`artist.ilike.%${search}%,title.ilike.%${search}%`);
      }

      const { data } = await query;
      if (data) setPosts(data);
    };

    fetchPosts();
  }, [search]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Publicações no Blogger</h1>
            <p className="text-muted-foreground">Vê todas as músicas processadas e publicadas automaticamente.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              className="pl-10" 
              placeholder="Pesquisar música ou artista..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-accent/20 rounded-xl border border-dashed">
            Ainda não há músicas publicadas. O sistema está aguardando as novas misturas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((item) => (
              <Card key={item.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-all group">
                {/* Imagem de Capa (Placeholder se não existir cover_url) */}
                <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
                  {item.cover_url ? (
                    <img 
                      src={item.cover_url} 
                      alt={`${item.artist} - ${item.title}`} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary/40 font-bold text-2xl">
                      {item.artist?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 shadow-sm">Publicado</Badge>
                  </div>
                </div>

                <CardContent className="p-5">
                  <div className="mb-4">
                    <h3 className="font-bold text-lg line-clamp-1" title={item.artist}>{item.artist || 'Artista Desconhecido'}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1" title={item.title}>{item.title || 'Música Sem Título'}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 mb-5">
                    <span>{format(new Date(item.processed_at), 'dd MMM yyyy, HH:mm')}</span>
                  </div>

                  <div className="pt-4 border-t flex items-center gap-2">
                    {item.blogger_url ? (
                      /* Publicado: abre o post no Blogger */
                      <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white" asChild>
                        <a href={item.blogger_url} target="_blank" rel="noreferrer">
                          <ExternalLink size={16} />
                          Ver no Blog
                        </a>
                      </Button>
                    ) : (
                      /* Ainda a processar: sem link disponível */
                      <div className="w-full flex items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 py-2 text-sm text-slate-400 select-none">
                        <svg className="animate-spin h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                        </svg>
                        A processar...
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default History;