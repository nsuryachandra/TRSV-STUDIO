import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, User, Lock, ArrowRight, UserPlus, Zap, Award, Info, LogIn, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Login({ onLogin }) {
  const [activeTab, setActiveTab] = useState('supporter'); // 'supporter' or 'admin'
  const [memberMode, setMemberMode] = useState('login'); // 'login' or 'register'

  // Admin state
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Supporter Login state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [memberError, setMemberError] = useState('');
  const [loading, setLoading] = useState(false);

  // Supporter Register state
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Live Username availability check state
  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, message: '' });

  // Debounced real-time username availability check
  useEffect(() => {
    if (!regUsername.trim()) {
      setUsernameStatus({ checking: false, available: null, message: '' });
      return;
    }

    const cleanUsername = regUsername.trim().toLowerCase();
    const timer = setTimeout(async () => {
      setUsernameStatus({ checking: true, available: null, message: 'Checking availability...' });
      
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(cleanUsername)}`);
        if (res.ok) {
          const data = await res.json();
          setUsernameStatus({
            checking: false,
            available: data.available,
            message: data.available ? 'Username available' : 'Username is already taken'
          });
          return;
        }
      } catch {
        // Fallback to client localStorage check
      }

      const storedMembers = JSON.parse(localStorage.getItem('trsv_registered_members') || '[]');
      const exists = storedMembers.some(m => m.username.toLowerCase() === cleanUsername);
      setUsernameStatus({
        checking: false,
        available: !exists,
        message: !exists ? 'Username available' : 'Username is already taken'
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [regUsername]);

  const handleAdminSubmit = (e) => {
    e.preventDefault();
    setAdminError('');
    if (adminUsername === 'surya_dev' && adminPassword === 'surya') {
      onLogin({ role: 'admin', username: 'surya_dev' });
    } else {
      setAdminError('Invalid admin credentials. Please try again.');
    }
  };

  const handleMemberLogin = async (e) => {
    e.preventDefault();
    setMemberError('');

    if (!loginUsername.trim() || !loginPassword) {
      setMemberError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword })
      });

      if (res.ok) {
        const user = await res.json();
        if (user.success !== false) {
          const profileData = { name: user.name, role: user.role, username: user.username, photoDataUrl: user.photo_url || '' };
          localStorage.setItem('posterforge_user_profile', JSON.stringify(profileData));
          onLogin({ role: 'supporter', profile: profileData });
          return;
        } else {
          setMemberError(user.error || 'Invalid username or password.');
          setLoading(false);
          return;
        }
      }
    } catch {
      console.warn('Backend API login offline, checking client storage fallback');
    }

    // Fallback to local storage registered members
    const storedMembers = JSON.parse(localStorage.getItem('trsv_registered_members') || '[]');
    const found = storedMembers.find(
      m => m.username.toLowerCase() === loginUsername.trim().toLowerCase() && m.password === loginPassword
    );

    setLoading(false);

    if (found) {
      const profileData = { name: found.name, role: found.role, username: found.username, photoDataUrl: '' };
      localStorage.setItem('posterforge_user_profile', JSON.stringify(profileData));
      onLogin({ role: 'supporter', profile: profileData });
    } else {
      setMemberError('Invalid username or password. If you are new, click "Create Account".');
    }
  };

  const handleMemberRegister = async (e) => {
    e.preventDefault();
    setMemberError('');

    if (!regName.trim() || !regRole.trim() || !regUsername.trim() || !regPassword) {
      setMemberError('All registration fields are required.');
      return;
    }

    if (usernameStatus.available === false) {
      setMemberError('Username is already taken. Please choose another username.');
      return;
    }

    setLoading(true);

    const newMember = {
      name: regName.trim(),
      role: regRole.trim(),
      username: regUsername.trim().toLowerCase(),
      password: regPassword
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember)
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        const profileData = { name: data.name, role: data.role, username: data.username, photoDataUrl: '' };
        localStorage.setItem('posterforge_user_profile', JSON.stringify(profileData));
        onLogin({ role: 'supporter', profile: profileData });
        return;
      } else {
        setMemberError(data.error || 'Username is already taken. Please choose another.');
        setLoading(false);
        return;
      }
    } catch {
      console.warn('Backend registration API unreachable, saving locally');
    }

    // Fallback local storage registration
    const storedMembers = JSON.parse(localStorage.getItem('trsv_registered_members') || '[]');
    if (storedMembers.some(m => m.username.toLowerCase() === newMember.username)) {
      setMemberError('Username is already taken. Please choose another username.');
      setLoading(false);
      return;
    }

    storedMembers.push(newMember);
    localStorage.setItem('trsv_registered_members', JSON.stringify(storedMembers));

    const profileData = { name: newMember.name, role: newMember.role, username: newMember.username, photoDataUrl: '' };
    localStorage.setItem('posterforge_user_profile', JSON.stringify(profileData));

    setLoading(false);
    onLogin({ role: 'supporter', profile: profileData });
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-4 relative overflow-y-auto select-none bg-slate-50 py-8 sm:py-12">
      {/* Soft colorful background blur accents */}
      <div className="absolute top-[-10%] left-[-5%] w-[45%] h-[45%] rounded-full pointer-events-none bg-amber-200/30 blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[45%] h-[45%] rounded-full pointer-events-none bg-blue-200/30 blur-3xl" />
      <div className="absolute top-[35%] right-[15%] w-[30%] h-[30%] rounded-full pointer-events-none bg-emerald-200/25 blur-3xl" />

      {/* Modern Card */}
      <div className="relative z-10 w-full max-w-[440px] my-auto">
        <div className="h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-500" />

        <div className="bg-white/90 backdrop-blur-xl rounded-b-2xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 overflow-hidden">
          
          {/* Header */}
          <div className="px-8 pt-7 pb-5 text-center relative">
            <img src="/trsv_logo.png" className="w-14 h-14 mx-auto mb-3 object-contain" alt="TRSV Logo" />
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-poppins">
              TRSV <span className="text-amber-500">Design Studio</span>
            </h1>
            <p className="text-xs font-bold mt-1 tracking-wider uppercase text-blue-600">
              Supporter Campaign Poster Generator
            </p>
          </div>

          {/* Main Role Selection (Supporter vs Admin) */}
          <div className="px-4 sm:px-6 pb-3">
            <div className="flex gap-1 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
              <button
                type="button"
                onClick={() => setActiveTab('supporter')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-200 ${
                  activeTab === 'supporter'
                    ? 'bg-white text-emerald-700 shadow-sm border border-emerald-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <User size={13} className="shrink-0" />
                Supporter Member
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 px-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-200 ${
                  activeTab === 'admin'
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Shield size={13} className="shrink-0" />
                Admin Studio
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-4 sm:px-6 pb-6">
            
            {/* Supporter Section */}
            {activeTab === 'supporter' && (
              <div className="space-y-4">
                
                {/* Sub Mode Switcher: Sign In vs Create Account */}
                <div className="flex justify-between items-center bg-emerald-50/70 p-1 rounded-xl border border-emerald-200/60">
                  <button
                    type="button"
                    onClick={() => { setMemberMode('login'); setMemberError(''); }}
                    className={`flex-1 text-[11px] sm:text-xs font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      memberMode === 'login'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-emerald-800 hover:bg-emerald-100/60'
                    }`}
                  >
                    <LogIn size={13} />
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMemberMode('register'); setMemberError(''); }}
                    className={`flex-1 text-[11px] sm:text-xs font-bold py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      memberMode === 'register'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-emerald-800 hover:bg-emerald-100/60'
                    }`}
                  >
                    <UserPlus size={13} />
                    Create Account
                  </button>
                </div>

                {memberError && (
                  <div className="p-3 rounded-xl text-xs font-semibold text-center bg-red-50 border border-red-200 text-red-600 flex items-center justify-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{memberError}</span>
                  </div>
                )}

                {/* Member LOGIN Form */}
                {memberMode === 'login' && (
                  <form onSubmit={handleMemberLogin} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-500">Username</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                        <input
                          type="text"
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          placeholder="Enter your username"
                          className="pf-input pf-input-has-icon"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-500">Password</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pf-input pf-input-has-icon"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-green w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                    >
                      <Zap size={15} />
                      {loading ? 'Authenticating...' : 'Sign In to Portal'}
                      <ArrowRight size={14} />
                    </button>
                  </form>
                )}

                {/* Member REGISTER Form */}
                {memberMode === 'register' && (
                  <form onSubmit={handleMemberRegister} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-500">Full Name</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                        <input
                          type="text"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. N. Suryachandra"
                          className="pf-input pf-input-has-icon"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-500">Designation / Role</label>
                      <div className="relative">
                        <UserPlus size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                        <input
                          type="text"
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value)}
                          placeholder="e.g. Youth Wing President"
                          className="pf-input pf-input-has-icon"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Choose Username</label>
                        {usernameStatus.message && (
                          <span className={`text-[10px] font-bold flex items-center gap-1 ${
                            usernameStatus.available === true ? 'text-emerald-600' :
                            usernameStatus.available === false ? 'text-red-600' : 'text-slate-400'
                          }`}>
                            {usernameStatus.available === true && <CheckCircle2 size={11} />}
                            {usernameStatus.available === false && <AlertCircle size={11} />}
                            {usernameStatus.message}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="surya_trsv"
                        className={`pf-input ${
                          usernameStatus.available === false ? 'border-red-400 focus:border-red-500' :
                          usernameStatus.available === true ? 'border-emerald-400 focus:border-emerald-500' : ''
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-500">Set Password</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pf-input"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || usernameStatus.available === false}
                      className="btn-green w-full flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                    >
                      <UserCheck size={15} />
                      {loading ? 'Creating Profile...' : 'Register & Enter Portal'}
                      <ArrowRight size={14} />
                    </button>
                  </form>
                )}

              </div>
            )}

            {/* Admin View */}
            {activeTab === 'admin' && (
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="text-center">
                  <span className="badge-blue inline-flex items-center gap-1 mb-2">
                    <Shield size={12} />
                    Administrator Access
                  </span>
                  <h2 className="text-sm font-bold text-slate-800">Admin Control Studio</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Authenticate to manage campaign templates</p>
                </div>

                {adminError && (
                  <div className="p-3 rounded-xl text-xs font-semibold text-center bg-red-50 border border-red-200 text-red-600">
                    {adminError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-500">Username</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                      <input
                        type="text"
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="admin"
                        className="pf-input pf-input-has-icon"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-500">Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pf-input pf-input-has-icon"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="btn-blue w-full flex items-center justify-center gap-2 mt-2">
                  <Shield size={15} />
                  Login to Admin Area
                  <ArrowRight size={14} />
                </button>
              </form>
            )}
          </div>

          {/* Footer with Unofficial Disclaimer */}
          <div className="px-6 py-3.5 bg-slate-50/90 border-t border-slate-100 text-center flex flex-col items-center gap-1">
            <div className="flex items-center gap-1 text-slate-500">
              <Info size={12} className="text-amber-500" />
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600">
                TRSV Design Studio
              </span>
            </div>
            <span className="text-[9.5px] font-semibold text-slate-400 tracking-wider uppercase">
              Unofficial Fan & Supporter Campaign Tool
            </span>
            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">
              Built by Surya
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
