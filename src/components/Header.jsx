import React from 'react';

export default function Header({title, onOpenSettings, user, onLogout}){
  return (
    <div className="w-full bg-white dark:bg-gray-800 shadow p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button className="text-lg" onClick={()=>window.scrollTo(0,0)}>🏠</button>
        <div className="font-semibold">{title}</div>
      </div>
      <div className="flex items-center space-x-3">
        {user && <div className="text-sm">Hi, {user.email}</div>}
        <button onClick={onOpenSettings} className="px-2 py-1 rounded bg-gray-100">⚙️</button>
        {user && <button onClick={onLogout} className="px-2 py-1 rounded bg-red-100 text-red-700">Đăng xuất</button>}
      </div>
    </div>
  );
}
