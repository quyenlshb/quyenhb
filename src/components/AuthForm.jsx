import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

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

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">{mode==='login' ? 'Đăng nhập' : 'Đăng ký'}</h3>
      <form onSubmit={submit} className="space-y-2">
        <input className="w-full p-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input type="password" className="w-full p-2 border rounded" placeholder="Mật khẩu" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <div className="text-red-500 text-sm">{err}</div>}
        <div className="flex space-x-2">
          <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded">{mode==='login' ? 'Đăng nhập' : 'Đăng ký'}</button>
          <button type="button" onClick={()=>setMode(mode==='login'?'register':'login')} className="px-3 py-1 border rounded">Chuyển</button>
        </div>
      </form>
    </div>
  );
}
