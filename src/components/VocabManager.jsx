import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { nanoid } from 'nanoid';

export default function VocabManager({ user, db }) {
  const [sets, setSets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [paste, setPaste] = useState('');

  // Lắng nghe dữ liệu sets từ component cha (App.jsx)
  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'vocabData', user.uid);
      const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setSets(docSnap.data().sets || []);
        }
      });
      return () => unsub();
    }
  }, [user, db]);

  const addSet = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thực hiện!');
      return;
    }
    const name = prompt('Tên bộ từ mới');
    if (!name) return;
    const ns = { id: nanoid(), name, items: [], updatedAt: Date.now() };

    const userDocRef = doc(db, 'vocabData', user.uid);
    try {
      await updateDoc(userDocRef, { sets: [...sets, ns] });
      toast.success('Đã thêm bộ từ thành công!');
    } catch (e) {
      console.error('Lỗi khi đồng bộ bộ từ mới:', e);
      toast.error('Đã xảy ra lỗi!');
    }
  };

  const importPaste = async () => {
    if (!selected || !user) {
      toast.error('Vui lòng chọn bộ từ và đăng nhập trước khi import.');
      return;
    }
    const lines = paste.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items = [];
    lines.forEach(line => {
      const parts = line.split(/\s+/);
      if (parts.length >= 3) {
        items.push({
          id: nanoid(),
          kanji: parts[0],
          kana: parts[1],
          meaning: parts[2],
          note: parts.slice(3).join(' ') || '',
          masteryLevel: 0,
          lastReviewedAt: null
        });
      }
    });
    if (items.length === 0) {
      toast.error('Không tìm thấy từ vựng nào hợp lệ để import.');
      return;
    }

    const updatedSets = sets.map(s => {
      if (s.id === selected.id) {
        return { ...s, items: [...s.items, ...items], updatedAt: Date.now() };
      }
      return s;
    });

    const userDocRef = doc(db, 'vocabData', user.uid);
    try {
      await updateDoc(userDocRef, { sets: updatedSets });
      setPaste('');
      setSelected({ ...selected, items: [...selected.items, ...items] });
      toast.success(`Đã thêm ${items.length} từ vựng mới vào bộ từ.`);
    } catch (e) {
      console.error('Lỗi khi import:', e);
      toast.error('Đã xảy ra lỗi!');
    }
  };

  const sortedSets = [...sets].sort((a, b) => b.updatedAt - a.updatedAt);
  const sortedItems = selected ? [...selected.items].sort((a, b) => a.masteryLevel - b.masteryLevel) : [];

  return (
    <div className="p-4 rounded-xl shadow-md bg-white dark:bg-gray-800">
      <h2 className="text-2xl font-bold mb-4">Quản lý Từ vựng</h2>
      <button
        onClick={addSet}
        className="w-full mb-4 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition"
      >
        Thêm bộ từ mới
      </button>

      <div className="space-y-4">
        <h3 className="font-bold text-lg mb-2">Các bộ từ</h3>
        {sortedSets.length === 0 && <p className="text-gray-500 text-center">Chưa có bộ từ nào. Vui lòng thêm bộ từ mới.</p>}
        {sortedSets.map(s => (
          <div
            key={s.id}
            onClick={() => setSelected(s)}
            className={`p-3 rounded-lg shadow cursor-pointer transition ${selected && selected.id === s.id ? 'bg-indigo-100 dark:bg-indigo-900 border-2 border-indigo-500' : 'bg-gray-100 dark:bg-gray-700'}`}
          >
            <div className="font-medium">{s.name} <span className="text-sm text-gray-500 dark:text-gray-400">({s.items.length} từ)</span></div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-6 p-4 rounded-xl shadow-md bg-gray-50 dark:bg-gray-700">
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
                <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 pl-4 flex-shrink-0">
                  ML: {it.masteryLevel}
                </div>
              </div>
            ))}
          </div>
          <textarea
            value={paste}
            onChange={e => setPaste(e.target.value)}
            className="w-full p-2 border rounded mt-3 text-gray-800 dark:text-gray-200 dark:bg-gray-800"
            rows={4}
            placeholder="Dán từ vựng vào đây (định dạng: Kanji Kana Nghĩa Ghi chú)"
          ></textarea>
          <button
            onClick={importPaste}
            className="w-full px-4 py-2 mt-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
          >
            Import
          </button>
        </div>
      )}
    </div>
  );
}