import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const AuthForm: React.FC = () => {
  const { signIn, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'FINANCE' | 'ADMIN'>('STUDENT');
  const [secretCode, setSecretCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
        await signIn();
    } catch (err: any) {
        setMessage({ text: err.message, type: 'error' });
    } finally {
        setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const trimmedEmail = email.trim();

    if (!isLogin && role === 'FINANCE' && secretCode !== 'Finance123') {
      setMessage({ text: 'Invalid Finance Admin code.', type: 'error' });
      setLoading(false);
      return;
    }

    if (!isLogin && role === 'ADMIN' && secretCode !== 'Admin123') {
      setMessage({ text: 'Invalid Admin code.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        await signInWithEmail(trimmedEmail, password);
      } else {
        await signUpWithEmail(trimmedEmail, password, displayName, role);
      }
    } catch (err: any) {
      console.error("Auth Exception:", err.code, err.message);
      let errorMessage = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password sign-in is disabled. Please enable it in the Firebase Console.';
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. If you created your account using Google, please use the Google Sign-In button instead.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Connection lost. Please check your internet or disable any ad-blockers.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too short (minimum 6 characters).';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'That email address doesn\'t look right. Please check for typos.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errorMessage = 'Incorrect email or password. If you signed up via Google, please use the Google button below. If you intended to create a new account, please click "Join us now" below.';
      } else if (err.message.includes('No account found for this Google email')) {
        errorMessage = err.message;
      }
      setMessage({ text: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage({ text: 'Please enter your email first.', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setMessage({ text: 'Password reset link sent! If the email link opens a broken Netlify page, please go to Firebase Console > Authentication > Templates > Password Reset and restore the default action URL.', type: 'success' });
      setIsForgotPassword(false);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
        <button 
          onClick={() => { setIsLogin(true); setMessage(null); }}
          className={cn(
            "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
            isLogin ? "bg-white text-[#1a237e] shadow-sm" : "text-gray-400 hover:text-gray-600"
          )}
        >
          Sign In
        </button>
        <button 
          onClick={() => { setIsLogin(false); setMessage(null); }}
          className={cn(
            "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
            !isLogin ? "bg-white text-[#1a237e] shadow-sm" : "text-gray-400 hover:text-gray-600"
          )}
        >
          Register
        </button>
      </div>

      <form onSubmit={isForgotPassword ? handleResetPassword : handleSubmit} className="space-y-4">
        {message && (
          <div className={cn("p-4 rounded-xl text-[11px] font-bold leading-relaxed", message.type === 'error' ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100")}>
            {message.text}
          </div>
        )}

      {isForgotPassword ? (
        <>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400">Email Address</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your registered email" className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 font-bold focus:ring-1 focus:ring-[#1a237e] outline-none" />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a237e] text-white py-4 rounded-xl font-black hover:shadow-lg transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
          </button>
          <button 
            type="button"
            onClick={() => setIsForgotPassword(false)}
            className="w-full text-[10px] font-black uppercase text-gray-400 hover:text-[#1a237e] text-center mt-2"
          >
            Back to Sign In
          </button>
        </>
      ) : (
        <>
          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400">Full Name</label>
                <input required type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 font-bold focus:ring-1 focus:ring-[#1a237e] outline-none" />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400">Account Type</label>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setRole('STUDENT')}
                    className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all", role === 'STUDENT' ? "bg-[#1a237e] text-white border-[#1a237e]" : "bg-white border-gray-100 text-gray-400")}
                  >
                    Student
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRole('FINANCE')}
                    className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all", role === 'FINANCE' ? "bg-[#1a237e] text-white border-[#1a237e]" : "bg-white border-gray-100 text-gray-400")}
                  >
                    Finance Admin
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setRole('ADMIN')}
                    className={cn("flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all", role === 'ADMIN' ? "bg-[#1a237e] text-white border-[#1a237e]" : "bg-white border-gray-100 text-gray-400")}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {(role === 'FINANCE' || role === 'ADMIN') && (
                <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                  <label className="text-[10px] font-black uppercase text-[#ff5a5a]">Secret Access Code</label>
                  <input 
                    required 
                    type="text" 
                    value={secretCode} 
                    onChange={e => setSecretCode(e.target.value)} 
                    placeholder="Enter access code"
                    className="w-full p-3 rounded-xl border border-red-100 bg-red-50 font-bold focus:ring-1 focus:ring-[#ff5a5a] text-[#ff5a5a] outline-none placeholder:text-red-200" 
                  />
                </div>
              )}
            </>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400">Email Address</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 font-bold focus:ring-1 focus:ring-[#1a237e] outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400">Password</label>
            <div className="relative">
              <input required type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-xl border border-gray-100 bg-gray-50 font-bold focus:ring-1 focus:ring-[#1a237e] outline-none" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#1a237e] text-white py-4 rounded-xl font-black hover:shadow-lg transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-400 font-bold uppercase tracking-widest">Or</span>
            </div>
          </div>

          <button 
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
            className="w-full border border-gray-200 py-4 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign in with Google'}
          </button>

          <div className="flex flex-col gap-2 pt-2">
            {isLogin && (
                <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[10px] font-black uppercase text-gray-400 hover:text-[#1a237e]">
                Forgot Password?
                </button>
            )}
          </div>
        </>
      )}
    </form>
  </div>
  );
};
