import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();

        if (res.ok) {
          setStatus('success');
          // Optional: Log them in immediately
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => navigate('/'), 3000);
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    };

    if (token) verify();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
      <div className="bg-slate-900 border border-slate-700 p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
        
        {status === 'verifying' && (
          <>
            <Loader2 size={64} className="text-blue-500 animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Verifying your email...</h1>
            <p className="text-slate-400">Please wait while we confirm your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={64} className="text-emerald-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Account Verified!</h1>
            <p className="text-slate-400 mb-6">Your email has been confirmed. Redirecting you to the game...</p>
            <button onClick={() => navigate('/')} className="w-full bg-blue-600 py-3 rounded-xl font-bold">
              Go to Dashboard Now
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={64} className="text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2">Verification Failed</h1>
            <p className="text-slate-400 mb-6">The link is invalid or has expired.</p>
            <button onClick={() => navigate('/')} className="w-full bg-slate-800 py-3 rounded-xl font-bold border border-slate-700">
              Return Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;