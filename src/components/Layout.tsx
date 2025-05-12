
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Home, Camera, MessageSquare, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto pb-16 px-4">
        {children}
      </main>
      
      {/* Modern dark mode bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-accent/50 backdrop-blur-lg border-t border-border py-2">
        <div className="flex items-center justify-around">
          <Link
            to="/"
            className={`flex flex-col items-center p-2 ${isActive('/') ? 'text-brand-primary' : 'text-gray-500'}`}
          >
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </Link>
          
          <Link
            to="/camera"
            className={`flex flex-col items-center p-2 ${isActive('/camera') ? 'text-brand-primary' : 'text-gray-500'}`}
          >
            <Camera size={24} />
            <span className="text-xs mt-1">Camera</span>
          </Link>
          
          <Link
            to="/chat"
            className={`flex flex-col items-center p-2 ${isActive('/chat') ? 'text-brand-primary' : 'text-gray-500'}`}
          >
            <MessageSquare size={24} />
            <span className="text-xs mt-1">Chat</span>
          </Link>
          
          <Link
            to="/profile"
            className={`flex flex-col items-center p-2 ${isActive('/profile') ? 'text-brand-primary' : 'text-gray-500'}`}
          >
            <User size={24} />
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
