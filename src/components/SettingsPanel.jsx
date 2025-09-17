import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { toast } from 'react-toastify';

export default function SettingsPanel({ settings, setSettings, onUpdateSettings }) {
  const [timer, setTimer] = useState(settings.timer);
  const [perSession, setPerSession] = useState(settings.perSession);
  const [dailyTarget, setDailyTarget] = useState(settings.dailyTarget);

  const save = () => {
    if (dailyTarget < (settings.dailyTarget || 0)) {
      toast.error('Mục tiêu chỉ có thể tăng, không thể giảm');
      return;
    }
    const ns = { ...settings, timer, perSession, dailyTarget, canSetTarget: settings.canSetTarget };
    setSettings(ns);
    saveLocal('settings', ns);
    onUpdateSettings(ns);
    toast.success('Đã lưu cài đặt!');
  };

  return (
    <div className="p-4 bg-white rounded shadow-md transition-transform duration-300 ease-in-out">
      <h3 className="font-bold text-lg mb-3">Cài đặt</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Thời gian mỗi câu (giây)</label>
          <input
            type="number"
            value={timer}
            onChange={(e) => setTimer(Math.max(5, Number(e.target.value)))}
            className="w-full p-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Số từ mỗi lần luyện tập</label>
          <input
            type="number"
            value={perSession}
            onChange={(e) => setPerSession(Math.max(1, Number(e.target.value)))}
            className="w-full p-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Mục tiêu điểm hàng ngày</label>
          <input
            type="number"
            value={dailyTarget}
            onChange={(e) => setDailyTarget(Math.max(1, Number(e.target.value)))}
            className="w-full p-2 border rounded-lg"
          />
        </div>
        <button
          onClick={save}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition"
        >
          Lưu cài đặt
        </button>
      </div>
    </div>
  );
}