import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { googleProvider } from '../firebase';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaGoogle } from 'react-icons/fa';
import { toast } from 'react-toastify';

export default function AuthForm({ auth }){
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      switch (e.code) {
        case 'auth/wrong-password':
          setErr('Mật khẩu không đúng.');
          break;
        case 'auth/user-not-found':
          setErr('Tài khoản không tồn tại.');
          break;
        case 'auth/email-already-in-use':
          setErr('Email đã được sử dụng.');
          break;
        case 'auth/invalid-email':
          setErr('Email không hợp lệ.');
          break;
        case 'auth/weak-password':
          setErr('Mật khẩu phải có ít nhất 6 ký tự.');
          break;
        default:
          setErr('Lỗi đăng nhập/đăng ký. Vui lòng thử lại.');
          console.error(e);
      }
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Đăng nhập bằng Google thành công!");
    } catch (e) {
      console.error(e);
      toast.error("Lỗi đăng nhập bằng Google.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-screen-minus-header bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-sm p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-transform duration-300 ease-in-out">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
          {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <FaEnvelope />
            </span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
              <FaLock />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {err && <div className="text-red-500 text-sm text-center">{err}</div>}
          <button type="submit" className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200">
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">Hoặc</span>
          </div>
        </div>

        <button onClick={signInWithGoogle} className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition duration-200">
          <FaGoogle className="mr-2 text-blue-500" />
          <span className="text-gray-700 dark:text-white">Đăng nhập với Google</span>
        </button>

        <div className="text-center mt-4">
          <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-blue-500 hover:underline">
            {mode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
}