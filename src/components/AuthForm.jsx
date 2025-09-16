import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { googleProvider } from './firebase'; // Import googleProvider

export default function AuthForm({ auth }){
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      if(mode==='login'){
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch(e){
      setErr(e.message);
    }
  };

  const signInWithGoogle = async () => {
    setErr('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch(e){
      setErr(e.message);
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-md">
      <h3 className="text-xl font-bold mb-4 text-center">{mode==='login' ? 'Đăng nhập' : 'Đăng ký'}</h3>
      <form onSubmit={submit} className="space-y-4">
        <input className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mật khẩu" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-red-500 text-sm">{err}</div>}
        <div className="flex justify-center">
          <button type="submit" className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200">
            {mode==='login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </div>
      </form>
      <div className="text-center mt-4">
        <button onClick={()=>setMode(mode==='login' ? 'register' : 'login')} className="text-sm text-blue-500 hover:underline">
          {mode==='login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </div>

      {/* Thêm nút đăng nhập Google */}
      <div className="mt-6 text-center">
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Hoặc</span>
          </div>
        </div>
        <button onClick={signInWithGoogle} className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-md hover:bg-gray-100 transition duration-200">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" className="h-5 w-5 mr-2"/>
          Đăng nhập bằng Google
        </button>
      </div>
    </div>
  );
}