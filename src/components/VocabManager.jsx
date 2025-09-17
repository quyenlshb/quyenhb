import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function VocabManager({ db, user }) {
  const [sets, setSets] = useState(() => loadLocal('vocabSets', []));
  const [selected, setSelected] = useState(null);
  const [paste, setPaste] = useState('');

  useEffect(() => {
    saveLocal('vocabSets', sets);
  }, [sets]);

  const addSet = async () => {
    const name = prompt('Tên bộ từ mới');
    if (!name) return;
    const id = 'set_' + Date.now();
    const ns = { id, name, items: [], updatedAt: Date.now() };
    setSets(s => [...s, ns]);
    if (navigator.onLine && user) {
      try {
        await setDoc(doc(db, 'vocabData', user.uid), { sets: [...sets, ns] }, { merge: true });
      } catch (e) { console.error('Lỗi khi đồng bộ bộ từ mới:', e); }
    }
    toast.success('Đã thêm bộ từ thành công!');
  };

  const importPaste = () => {
    const lines = paste.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!selected) {
      toast.error('Vui lòng chọn bộ từ trước khi import.');
      return;
    }
    const items = [];
    for (const line of lines) {
      const parts = line.split('\t').map(p => p.trim());
      if (parts.length >= 3) {
        items.push({
          id: 'item_' + Date.now() + Math.random(),
          kanji: parts[0] || '',
          kana: parts[1] || '',
          meaning: parts[2] || '',
          note: parts[3] || '',
          createdAt: Date.now(),
          masteryLevel: 0
        });
      }
    }

    if (items.length > 0) {
      const newSets = sets.map(s => {
        if (s.id === selected.id) {
          const newItems = [...s.items, ...items];
          s.items = newItems;
          s.updatedAt = Date.now();
        }
        return s;
      });
      setSets(newSets);
      setSelected(newSets.find(s => s.id === selected.id));
      setPaste('');
      toast.success(`Đã thêm ${items.length} từ vào bộ '${selected.name}'`);
    } else {
      toast.error('Không có từ nào được thêm. Định dạng đúng là: Kanji\tKana\tNghĩa\tGhi chú');
    }
  };

  const sortedItems = selected ? [...selected.items].sort((a, b) => a.masteryLevel - b.masteryLevel) : [];

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold mb-4">Quản lý Từ vựng</h2>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
        <label className="block text-sm font-medium mb-1">Chọn bộ từ</label>
        <select onChange={e => setSelected(sets.find(s => s.id === e.target.value))} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:border-blue-500">
          <option value="">-- Chọn một bộ từ --</option>
          {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={addSet} className="mt-2 w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition">Thêm Bộ Từ Mới</button>
      </div>

      {selected && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2 flex justify-between items-center">
            {selected.name}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({selected.items.length} từ)</span>
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
            {sortedItems.map(it => (
              <div key={it.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div>
                  <div className="font-medium">{it.kanji} <span className="text-sm text-gray-500 dark:text-gray-400">{it.kana}</span></div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{it.meaning}</div>
                </div>
                {/* Đảm bảo ML không bị ẩn bằng flex-shrink-0 và thêm khoảng cách */}
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 pl-4 flex-shrink-0">
                  ML: {it.masteryLevel}
                </div>
              </div>
            ))}
          </div>
          <textarea value={paste} onChange={e => setPaste(e.target.value)} className="w-full p-2 border rounded mt-3" rows={4} placeholder="Dán từ vựng vào đây (định dạng: Kanji	Kana	Nghĩa	Ghi chú)"></textarea>
          <button onClick={importPaste} className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition">Import Từ Vựng</button>
        </div>
      )}
    </div>
  );
}