import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onOpenPhoneModal: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOpenPhoneModal }) => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, loginAsDemo, isLoading } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      if (tab === 'signin') {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password, name);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed.');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      console.warn('Google sign-in:', err);
      // If popup was blocked or failed, prompt them or fallback
      setErrorMsg('Google Sign-In was cancelled or popup was closed. You can also sign in with email above.');
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf8ff] flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#e3e1ec] flex flex-col gap-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <img
            alt="OmniVault Logo"
            className="h-12 w-auto object-contain"
            src="https://lh3.googleusercontent.com/aida/AEtjO1XSIZZWvXHrOIrUbfkW6MT-lO3GmY0wUc01d8ug_nwaAQE2A9MG9F9nC2cju57PAmd60O6u8yzyaqqCYey8EgUaI5grerFfnM8k7Vky7bZmAv5uL-HY3yiW3U23KoimuKNhV6tuIv3lgljtoXrolIkX8dCIy3gS-nFlyvt82H5j_PUQBDtKRQ46b8s5liL8CF9Nc6Fw6iDrzCHTxpFn0IY5qN5rdQX_gaydfC849irhjWrJmBZ-FvHTzfk"
          />
          <h1 className="font-bold text-[22px] text-[#1a1b22] tracking-tight">
            OmniVault Account Login
          </h1>
          <p className="text-[13px] text-[#45474a] leading-snug max-w-xs">
            Sign in to access your personal cryptographic digital twin ledger.
          </p>
        </div>

        {/* Real Data Isolation Notice */}
        <div className="bg-[#f4f2fd] rounded-2xl p-3 border border-[#e3e1ec]/60 flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[#0051d5] text-[18px] shrink-0 mt-0.5">
            verified_user
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-[12px] text-[#1a1b22]">Clean Vault Mode</span>
            <span className="text-[11px] text-[#45474a] leading-tight mt-0.5">
              When logged into your account, all dummy sample items are hidden. Only your genuine optical scans and saved records will appear.
            </span>
          </div>
        </div>

        {/* Tabs: Sign In / Create Account */}
        <div className="flex bg-[#eeedf7] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
              tab === 'signin' ? 'bg-white text-[#1a1b22] shadow-sm' : 'text-[#45474a]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all ${
              tab === 'signup' ? 'bg-white text-[#1a1b22] shadow-sm' : 'text-[#45474a]'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Google Single Sign-On Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full h-11 bg-white hover:bg-[#f4f2fd] text-[#1a1b22] font-semibold text-[13px] rounded-xl border border-[#c6c6ca]/60 flex items-center justify-center gap-3 shadow-xs active:scale-98 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#eeedf7]" />
          <span className="font-mono text-[10px] text-[#45474a] uppercase tracking-wider">or email</span>
          <div className="flex-1 h-px bg-[#eeedf7]" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab === 'signup' && (
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] text-[#45474a]">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Alex Mercer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 px-3.5 bg-[#f4f2fd] rounded-xl text-[13px] border border-[#c6c6ca]/40 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
                required={tab === 'signup'}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[11px] text-[#45474a]">Email Address</label>
            <input
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 px-3.5 bg-[#f4f2fd] rounded-xl text-[13px] border border-[#c6c6ca]/40 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-mono text-[11px] text-[#45474a]">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 px-3.5 bg-[#f4f2fd] rounded-xl text-[13px] border border-[#c6c6ca]/40 focus:bg-white focus:ring-2 focus:ring-[#0051d5]/30 outline-none"
              required
            />
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-[#ffdad6] text-[#93000a] rounded-xl text-[12px] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#121417] hover:bg-[#1a1c1f] text-white font-semibold text-[13px] rounded-xl shadow-md active:scale-98 transition-all mt-1"
          >
            {isLoading ? 'Processing...' : tab === 'signin' ? 'Sign In to Vault' : 'Create Real Account'}
          </button>
        </form>

        {/* Demo / Preview Button */}
        <div className="pt-2 border-t border-[#eeedf7] flex flex-col gap-2">
          <button
            type="button"
            onClick={loginAsDemo}
            className="w-full h-10 bg-[#eeedf7] hover:bg-[#e8e7f1] text-[#1a1b22] text-[12px] font-medium rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-[#45474a]">explore</span>
            <span>Explore Demo Data (Prototype Mode)</span>
          </button>

          {/* How to access on phone trigger */}
          <button
            type="button"
            onClick={onOpenPhoneModal}
            className="w-full h-10 bg-[#f4f2fd] hover:bg-[#eeedf7] text-[#0051d5] text-[12px] font-semibold rounded-xl flex items-center justify-center gap-2 border border-[#0051d5]/20 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">smartphone</span>
            <span>How to Access on Your Phone?</span>
          </button>
        </div>
      </div>
    </div>
  );
};
