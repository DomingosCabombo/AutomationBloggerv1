"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Trash2, Edit2, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

interface Artist {
  id: string;
  name: string;
  created_at: string;
}

const ArtistManagement = () => {
  const [artists, setArtists] = React.useState<Artist[]>([]);
  const [newArtistName, setNewArtistName] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAdding, setIsAdding] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');

  const fetchArtists = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      showError("Failed to fetch artists.");
    } else {
      setArtists(data || []);
    }
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchArtists();
  }, []);

  const handleAddArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArtistName.trim()) return;

    setIsAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError("Please log in to add artists.");
      setIsAdding(false);
      return;
    }

    const { error } = await supabase
      .from('artists')
      .insert({ name: newArtistName.trim(), user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        showError("Artist already exists.");
      } else {
        showError("Failed to add artist.");
      }
    } else {
      showSuccess(`Artist "${newArtistName}" added.`);
      setNewArtistName('');
      fetchArtists();
    }
    setIsAdding(false);
  };

  const handleDeleteArtist = async (id: string, name: string) => {
    const { error } = await supabase
      .from('artists')
      .delete()
      .eq('id', id);

    if (error) {
      showError("Failed to delete artist.");
    } else {
      showSuccess(`Artist "${name}" removed.`);
      fetchArtists();
    }
  };

  const startEditing = (artist: Artist) => {
    setEditingId(artist.id);
    setEditName(artist.name);
  };

  const handleUpdateArtist = async (id: string) => {
    if (!editName.trim()) return;

    const { error } = await supabase
      .from('artists')
      .update({ name: editName.trim() })
      .eq('id', id);

    if (error) {
      showError("Failed to update artist.");
    } else {
      showSuccess("Artist updated.");
      setEditingId(null);
      fetchArtists();
    }
  };

  const filteredArtists = artists.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md shadow-lg shadow-black/20 text-slate-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/10 mb-4">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <UserPlus size={20} className="text-indigo-400" />
            Gestão de Artistas
          </CardTitle>
          <CardDescription className="text-slate-400">Adiciona ou remove os artistas que a Inteligência Artificial deve procurar.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAddArtist} className="flex gap-3">
          <Input 
            placeholder="Nome do artista..." 
            value={newArtistName}
            onChange={(e) => setNewArtistName(e.target.value)}
            className="flex-1 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
          />
          <Button type="submit" disabled={isAdding || !newArtistName.trim()} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
            {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Adicionar Artista
          </Button>
        </form>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <Input 
            className="pl-10 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500" 
            placeholder="Pesquisar artistas..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-900/30">
          <Table>
            <TableHeader className="bg-slate-900/50">
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-slate-300">Nome do Artista</TableHead>
                <TableHead className="text-right text-slate-300">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto text-muted-foreground" size={24} />
                  </TableCell>
                </TableRow>
              ) : filteredArtists.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableCell colSpan={2} className="text-center py-8 text-slate-500">
                    Nenhum artista encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredArtists.map((artist) => (
                  <TableRow key={artist.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell>
                      {editingId === artist.id ? (
                        <Input 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleUpdateArtist(artist.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateArtist(artist.id)}
                          autoFocus
                          className="h-8 bg-slate-900/50 border-indigo-500/50 text-white"
                        />
                      ) : (
                        <span className="font-medium text-slate-200">{artist.name}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-indigo-400 hover:bg-indigo-400/10"
                          onClick={() => startEditing(artist)}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                          onClick={() => handleDeleteArtist(artist.id, artist.name)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArtistManagement;