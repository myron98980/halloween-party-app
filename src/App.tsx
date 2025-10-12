// src/App.tsx

import React, { useState, useEffect } from 'react';
// CORRECCIÓN 1: Importamos el tipo 'User' por separado usando 'import type'
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from './firebase';
import { Toaster } from 'sonner';

import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import backgroundImage from './assets/background.png';

interface AppUser {
  name: string;
  email?: string | null;
  uid?: string;
}

const App: React.FC = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const appUser: AppUser = {
          name: firebaseUser.displayName || 'Usuario Anónimo',
          email: firebaseUser.email,
          uid: firebaseUser.uid,
        };
        setUser(appUser);
        localStorage.setItem('halloweenAppUser', JSON.stringify(appUser));
      } else {
        // Si no hay usuario de Firebase, revisamos si hay uno manual en localStorage
        const storedUser = localStorage.getItem('halloweenAppUser');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleManualLogin = (manualUserData: { nombre: string; apellido: string }) => {
    const manualUser: AppUser = {
      name: `${manualUserData.nombre} ${manualUserData.apellido}`,
    };
    setUser(manualUser);
    localStorage.setItem('halloweenAppUser', JSON.stringify(manualUser));
  };

  const appStyle = {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  };

  if (loading) {
    return <div style={appStyle} className="min-h-screen flex items-center justify-center text-white font-cinzel text-2xl">Verificando sesión...</div>;
  }

  return (
    <div style={appStyle} className="min-h-screen w-full">
       <Toaster 
        position="top-center" 
        toastOptions={{
          classNames: {
            toast: 'bg-gray-800 border-2 border-orange-500 text-white shadow-lg',
            success: '!bg-green-700 !border-green-500',
            error: '!bg-red-800 !border-red-600',
          },
        }}
      />
      {user ? (
        // CORRECCIÓN 2: Le pasamos al Dashboard solo las props que espera
        <Dashboard user={{ nombre: user.name }} />
      ) : (
        <LoginScreen onLoginSuccess={handleManualLogin} />
      )}
    </div>
  );
};

export default App;