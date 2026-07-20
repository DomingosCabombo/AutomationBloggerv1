"use client";

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  History, 
  Settings, 
  Terminal, 
  Music, 
  Users,
  Mic2,
  Menu,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Artists', path: '/artists' },
  { icon: Mic2, label: 'Audio Slogan', path: '/slogans' },
  { icon: History, label: 'Publicações', path: '/history' },
  { icon: Terminal, label: 'Logs', path: '/logs' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-xl border-r border-white/10 relative z-20">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Music className="text-white" size={24} />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">MusicFlow</span>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group font-medium",
              location.pathname === item.path 
                ? "bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]" 
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <item.icon size={20} className={cn(
              "transition-transform duration-200 group-hover:scale-110",
              location.pathname === item.path ? "text-white" : "text-slate-400 group-hover:text-indigo-400"
            )} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">System Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
            <span className="text-sm font-medium text-slate-300">Engine Ready</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 px-2 hover:bg-white/5 rounded-xl h-12">
              <Avatar className="h-8 w-8 ring-2 ring-white/10">
                <AvatarFallback className="bg-indigo-600 text-white font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left overflow-hidden">
                <span className="text-sm font-medium text-slate-200 truncate w-full">{user?.email}</span>
                <span className="text-xs text-indigo-400 font-medium">Active Session</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50 selection:bg-indigo-500/30 relative overflow-hidden">
      {/* Background Gradients globally for the Dashboard */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-20">
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="text-indigo-500" size={24} />
          <span className="font-bold text-white">MusicFlow</span>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu size={24} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;