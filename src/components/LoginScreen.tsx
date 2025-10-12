// src/components/LoginScreen.tsx

import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import calabaza from '../assets/calabaza.png';
import googleLogo from '../assets/google-logo.png'; // 1. Importa el logo de Google

// La interfaz de props no cambia
interface LoginScreenProps {
  onLoginSuccess: (user: { nombre: string; apellido: string }) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');

  // Lógica para el registro MANUAL
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim() && apellido.trim()) {
      onLoginSuccess({ nombre, apellido });
    } else {
      alert('Por favor, completa ambos campos.');
    }
  };

  // Lógica para el login con GOOGLE
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error al iniciar sesión con Google", error);
      alert("Hubo un problema al iniciar sesión con Google.");
    }
  };

  // Estilo base para ambos botones para mantener consistencia
  const buttonBaseStyle = "w-full flex items-center justify-center py-3 px-4 rounded-lg shadow-lg transition-transform transform hover:scale-105 duration-300 font-bold text-lg";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
      <div className="w-full max-w-sm mx-auto">
        <h1 className="font-cinzel text-4xl text-center text-orange-300 mb-4" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>Registro de Usuario</h1>
        <div className="flex justify-center items-center my-4">
          <img src={calabaza} alt="Calabaza decorativa" className="w-16 h-16"/>
        </div>

        {/* 2. El formulario ahora incluye directamente el botón de "Crear Cuenta" */}
        <form onSubmit={handleManualSubmit} className="w-full space-y-6">
          {/* Inputs de nombre y apellido */}
          <div>
            <label htmlFor="nombre" className="block text-orange-200 text-sm font-bold mb-2 ml-2">Nombre</label>
            <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value.toUpperCase())} placeholder="Nombre" className="uppercase w-full bg-transparent border-4 border-orange-500 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ background: 'rgba(0,0,0,0.3)' }}/>
          </div>
          <div>
            <label htmlFor="apellido" className="block text-orange-200 text-sm font-bold mb-2 ml-2">Apellido</label>
            <input id="apellido" type="text" value={apellido} onChange={(e) => setApellido(e.target.value.toUpperCase())} placeholder="Apellido" className="uppercase w-full bg-transparent border-4 border-orange-500 rounded-xl py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ background: 'rgba(0,0,0,0.3)' }}/>
          </div>

          {/* 3. NUEVO Botón "Crear Cuenta" */}
          <button
            type="submit"
            className={`${buttonBaseStyle} bg-orange-600 hover:bg-orange-700 text-white`}
          >
            Crear Cuenta
          </button>
        </form>

        {/* Espacio entre el formulario y el botón de Google */}
        <div className="my-4"></div> 
        
        {/* 4. NUEVO Botón de Iniciar Sesión con Google */}
        <button
          onClick={handleGoogleSignIn}
          className={`${buttonBaseStyle} bg-white hover:bg-gray-200 text-black border border-gray-300`}
        >
          <img src={googleLogo} alt="Logo de Google" className="w-10 h-8 mr-3" />
          Iniciar sesión con Google
        </button>

      </div>
    </div>
  );
};

export default LoginScreen;