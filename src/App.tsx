/** @format */
import { useState, useEffect } from 'react'; // Removi o 'React' não utilizado
import PreparationView from './views/PreparationView';
import FiltrosView from './views/FiltrosView';
import ResponderView from './views/ResponderView';
import ConsolidationView from './views/ConsolidationView';
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DB_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

interface User { name: string; email: string; photo?: string; }

export const db = getFirestore(firebaseApp);

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['preparacao', 'filtros', 'responder', 'consolidar'].includes(hash) ? hash : 'preparacao';
  });
  
  const [user, setUser] = useState<User | null>(null);
  const [rulesFile, setRulesFile] = useState<File | null>(null);
  const [senderFormFile, setSenderFormFile] = useState<File | null>(null);
  const [workerColors, setWorkerColors] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ 
          name: firebaseUser.displayName || "", 
          email: firebaseUser.email || "", 
          photo: firebaseUser.photoURL || "" 
        });
      } else { 
        setUser(null); 
      }
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try { 
      await signInWithPopup(auth, provider); 
    } catch (err: any) { 
      console.error("Erro no login:", err);
      alert("Erro ao realizar login.");
    }
  };

  const handleLogout = () => signOut(auth);

  useEffect(() => { window.location.hash = activeTab; }, [activeTab]);

  const isImmersive = activeTab === 'responder';

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden font-sans text-slate-800">
      <aside className={`transition-all duration-700 border-r border-slate-200 bg-white flex flex-col z-50 shadow-2xl ${isImmersive ? 'w-20' : 'w-72'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black">XF</div>
          {!isImmersive && <h1 className="text-xl font-black text-slate-800 tracking-tighter">XLS <span className="text-indigo-600">FUSION</span></h1>}
        </div>

        <nav className="flex-grow p-4 space-y-3">
          {[
            { id: 'preparacao', icon: '🎨', label: 'Preparação' }, 
            { id: 'filtros', icon: '⚡', label: 'Filtros' }, 
            { id: 'responder', icon: '📝', label: 'Responder' }, 
            { id: 'consolidar', icon: '📊', label: 'Consolidar' }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center rounded-2xl transition-all duration-300 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'} ${isImmersive ? 'p-4 justify-center' : 'p-4 gap-4'}`}>
              <span className="text-xl">{tab.icon}</span>
              {!isImmersive && <span className="font-bold text-[11px] uppercase tracking-widest">{tab.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          {user ? (
            <div className={`flex items-center gap-3 p-2 bg-slate-50 rounded-2xl ${isImmersive ? 'justify-center' : ''}`}>
              <img src={user.photo} className="w-8 h-8 rounded-full border-2 border-white" alt="User" />
              {!isImmersive && (
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-800 truncate">{user.name}</p>
                  <button onClick={handleLogout} className="text-[8px] font-black text-rose-500 uppercase hover:underline">Sair</button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={handleLogin} className={`w-full flex items-center gap-3 p-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-100 transition-all ${isImmersive ? 'justify-center' : ''}`}>
              <span>🔐</span> {!isImmersive && <span>Login</span>}
            </button>
          )}
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto relative bg-[#F8FAFC]">
        <div className={isImmersive ? "" : "p-10"}>
          {activeTab === 'preparacao' && (
            <PreparationView 
              user={user} onLogin={handleLogin} 
              rulesFile={rulesFile} setRulesFile={setRulesFile} 
              senderFormFile={senderFormFile} setSenderFormFile={setSenderFormFile} 
              workerColors={workerColors} setWorkerColors={setWorkerColors} 
              onExport={() => {}} onImport={() => {}} 
            />
          )}
          {activeTab === 'filtros' && <FiltrosView />}
          {activeTab === 'responder' && <ResponderView user={user} />}
          {activeTab === 'consolidar' && <ConsolidationView user={user} />}
        </div>
      </main>
    </div>
  );
}