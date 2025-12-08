
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { Logo3F } from '../components/Layout';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // await is crucial here to wait for the result
      const success = await login(email, password);
      if (!success) {
        // If login returns false, it usually means credentials were wrong
        setError('Email ou mot de passe incorrect.');
      }
      // If success is true, the AuthContext state updates and App.tsx redirects automatically
    } catch (err) {
      setError('Une erreur technique est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="bg-white p-8 text-center border-b border-gray-100">
          <div className="flex justify-center mb-6">
             <Logo3F className="w-full max-w-[240px]" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Espace de Gestion</h1>
          <p className="text-gray-500 mt-2 text-sm">Connectez-vous à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center text-sm font-medium">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Professionnel</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="email" 
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none transition-shadow"
                placeholder="nom@entreprise.ma"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="password" 
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none transition-shadow"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-red-700 text-white rounded-xl font-bold text-lg hover:bg-red-800 shadow-md transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5" /> Connexion...
              </>
            ) : (
              'Se Connecter'
            )}
          </button>

          <div className="text-center text-xs text-gray-400 mt-4">
             En cas de problème d'accès, contactez l'administrateur.
          </div>
        </form>
      </div>
      <p className="mt-8 text-gray-400 text-sm">&copy; 2024 3F INDUSTRIE - BTP Manager</p>
    </div>
  );
};

export default Login;
