
import React, { useState, useEffect } from 'react';
import { dbService, UserProfile } from '../services/dbService';

interface AuthProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [supportsPasskeys, setSupportsPasskeys] = useState(false);
  const [passkeyStatus, setPasskeyStatus] = useState<'idle' | 'blocked' | 'error'>('idle');

  useEffect(() => {
    const checkPasskeySupport = async () => {
      // Passkeys require a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.warn("AuditGig: Passkeys require a secure context. Falling back to password.");
        return;
      }

      if (window.PublicKeyCredential) {
        try {
          const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setSupportsPasskeys(available);
        } catch (err) {
          console.warn("AuditGig: Passkey check blocked by policy or browser.", err);
          setSupportsPasskeys(false);
        }
      }
    };
    checkPasskeySupport();
  }, []);

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setPasskeyStatus('idle');
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const credential = await navigator.credentials.get({ 
        publicKey: { 
          challenge, 
          timeout: 60000, 
          userVerification: 'required' 
        } 
      }) as PublicKeyCredential;

      if (credential) {
        const user = await dbService.getUserByCredentialId(credential.id);
        if (user) {
          onLoginSuccess(user);
        } else {
          alert("We couldn't find an account linked to this Passkey. Try your password?");
        }
      }
    } catch (err: any) {
      console.error("Passkey Authentication Failed", err);
      if (err.name === 'NotAllowedError') {
        // Specifically catch the Permissions Policy error
        setPasskeyStatus('blocked');
        console.warn("Passkey blocked by Permissions Policy in this frame.");
      } else if (err.name !== 'AbortError') {
        setPasskeyStatus('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySignup = async (userData: UserProfile) => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userID = new Uint8Array(16);
      window.crypto.getRandomValues(userID);
      
      const rpId = window.location.hostname || "localhost";

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "AuditGig Safety", id: rpId },
          user: { id: userID, name: userData.email, displayName: userData.name },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          timeout: 60000,
          attestation: "none",
        }
      }) as PublicKeyCredential;
      
      if (credential) return { ...userData, passkeyCredentialId: credential.id };
    } catch (err: any) {
      console.error("Passkey Creation Failed", err);
      if (err.name === 'NotAllowedError') {
        alert("Your current browser view blocks Passkey creation. We'll set up your account with a password instead.");
      }
    }
    return userData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    
    if (isLogin) {
      const existing = await dbService.getUser(formData.email);
      if (existing) {
        onLoginSuccess(existing);
      } else {
        alert("Welcome friend, please create an account first!");
      }
    } else {
      const newUser: UserProfile = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        balance: 0,
        joinedDate: new Date().toISOString(),
        stats: { impactPoints: 0, streak: 0, trustScore: 98, level: 1 }
      };
      
      let finalUser = newUser;
      if (supportsPasskeys && confirm("Would you like to enable a Passkey for faster, more secure access?")) {
        finalUser = await handlePasskeySignup(newUser);
      }

      await dbService.saveUser(finalUser);
      onLoginSuccess(finalUser);
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-[#f1f5f9]">
      <div className="w-full max-w-sm glass-card rounded-[3rem] p-10 space-y-8 shadow-2xl border-white/60">
        <div className="text-center space-y-2">
          <div className="inline-block bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-500/20 mb-2">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeWidth={2} />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">Audit<span className="text-blue-600">Gig</span></h1>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest leading-none">
            {isLogin ? 'Safety Guardian Access' : 'Begin your Journey'}
          </p>
        </div>

        {isLogin && (
          <div className="space-y-4">
            {supportsPasskeys && passkeyStatus === 'idle' ? (
              <button 
                onClick={handlePasskeyLogin} 
                disabled={loading}
                className="w-full bg-white border border-gray-100 py-4 rounded-2xl flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 transition-all font-bold text-sm active:scale-95"
              >
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Unlock with Passkey
              </button>
            ) : passkeyStatus === 'blocked' ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-center animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Passkey is restricted in this view</p>
                <p className="text-[9px] text-amber-600 font-medium mt-1">Please use your secure password below.</p>
              </div>
            ) : null}

            {supportsPasskeys && passkeyStatus === 'idle' && (
              <div className="flex items-center gap-4 py-1">
                <div className="flex-1 h-[1px] bg-gray-100"></div>
                <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">or</span>
                <div className="flex-1 h-[1px] bg-gray-100"></div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input 
              required 
              type="text" 
              placeholder="Full Name" 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-colors" 
            />
          )}
          <input 
            required 
            type="email" 
            placeholder="Email Address" 
            value={formData.email} 
            onChange={e => setFormData({ ...formData, email: e.target.value })} 
            className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-colors" 
          />
          <input 
            required 
            type="password" 
            placeholder="Guardian Password" 
            value={formData.password} 
            onChange={e => setFormData({ ...formData, password: e.target.value })} 
            className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 font-bold outline-none focus:border-blue-500 transition-colors" 
          />
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : isLogin ? 'Enter Portal' : 'Create Guardian Profile'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button 
            onClick={() => { setIsLogin(!isLogin); setPasskeyStatus('idle'); }} 
            className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] hover:text-blue-600 transition-colors"
          >
            {isLogin ? "Become a road guardian" : "Return to mission control"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
