import React from 'react';

export default function Header({title, onOpenSettings, user, onLogout, onBack, onHome}){
  return (
    <div className="w-full bg-white dark:bg-gray-800 shadow p-3 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button onClick={onBack} className="text-lg px-2 py-1 bg-gray-100 rounded">←</button>
        <button onClick={onHome} className="text-lg px-2 py-1 bg-gray-100 rounded">🏠</button>
        <div className="font-semibold ml-2">{title}</div>
      </div>
      <div className="flex items-center space-x-3">
        {user && <div className="text-sm">Hi, {user.email}</div>}
        <button onClick={onOpenSettings} className="px-2 py-1 rounded bg-gray-100">⚙️</button>
        {user && <button onClick={onLogout} className="px-2 py-1 rounded bg-red-100 text-red-700">Đăng xuất</button>}
      </div>
    </div>
  );
}
