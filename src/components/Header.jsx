import React from 'react';
import { FaArrowLeft, FaHome, FaCog, FaUserCircle, FaSignOutAlt } from 'react-icons/fa'; // Import các icon từ Font Awesome

export default function Header({ title, onOpenSettings, user, onLogout, onBack, onHome, showBackButton, showHomeButton }) {
  return (
    <header className="flex items-center justify-between p-4 bg-indigo-600 text-white shadow-lg sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        {showBackButton && (
          <button onClick={onBack} className="text-xl p-2 hover:bg-indigo-700 rounded-full transition">
            <FaArrowLeft /> {/* Icon mũi tên quay lại */}
          </button>
        )}
        {showHomeButton && (
          <button onClick={onHome} className="text-xl p-2 hover:bg-indigo-700 rounded-full transition">
            <FaHome /> {/* Icon ngôi nhà */}
          </button>
        )}
        {!showBackButton && !showHomeButton && (
          <div className="text-2xl font-bold">{title}</div>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <>
            <div className="flex items-center space-x-2">
              <FaUserCircle className="text-2xl" /> {/* Icon người dùng */}
              <span className="hidden sm:inline text-lg">{user.displayName || user.email}</span>
            </div>
            <button onClick={onOpenSettings} className="text-xl p-2 hover:bg-indigo-700 rounded-full transition">
              <FaCog /> {/* Icon cài đặt */}
            </button>
            <button onClick={onLogout} className="text-xl p-2 hover:bg-indigo-700 rounded-full transition">
              <FaSignOutAlt /> {/* Icon đăng xuất */}
            </button>
          </>
        )}
      </div>
    </header>
  );
}