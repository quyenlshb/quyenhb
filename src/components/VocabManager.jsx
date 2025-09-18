import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function VocabManager({ db, user }){
  const [sets, setSets] = useState(() => loadLocal('vocabSets', []) );
  const [selected, setSelected] = useState(null);
  const [paste, setPaste] = useState('');

  useEffect(() => {
    saveLocal('vocabSets', sets);
  }, [sets]);

  const addSet = async () => {
    const name = prompt('Tên bộ từ mới');
    if(!name) return;
    const id = 'set_' + Date.now();
    const ns = { id, name, items: [], updatedAt: Date.now() };
    setSets(s => [...s, ns]);
    // push to firestore when online
    if(navigator.onLine && user){
      try{
        await setDoc(doc(collection(db, 'vocabSets'), id), ns);
      }catch(e){ console.log(e); }
    }
    toast.success('Đã thêm bộ từ thành công!');
  };

  const importPaste = () => {
    const lines = paste.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(!selected) {
      toast.error('Vui lòng chọn bộ từ trước khi import.');
      return;
    }
    const items = [];
    for(const line of lines){
      const parts = line.split(/\s*\|\s*|\t+|\s{2,}/).map(p=>p.trim()).filter(Boolean);
      if(parts.length<3){ toast.error('Dòng sai định dạng: ' + line); continue; }
      const [kanji, kana, meaning] = parts;
      items.push({ id: 'w' + Date.now() + Math.random().toString(36).substring(2, 5), kanji, kana, meaning, note: '', updatedAt: Date.now() });
    }
    setSets(prev => prev.map(s => s.id === selected.id ? { ...s, items: [...s.items, ...items], updatedAt: Date.now() } : s));
    setPaste('');
    toast.success('Đã import từ thành công!');
  };

  const deleteSet = async (id) => {
    if(!confirm('Bạn có chắc muốn xóa bộ từ này?')) return;
    setSets(s => s.filter(x => x.id !== id));
    if(selected && selected.id === id) setSelected(null);
    if(navigator.onLine && user){
      try{ await deleteDoc(doc(db, 'vocabSets', id)); }catch(e){ console.log(e); }
    }
    toast.info('Đã xóa bộ từ!');
  };

  const saveNote = (setId, itemId, note) => {
    const setsLocal = loadLocal('vocabSets', []);
    const setObj = setsLocal.find(s=>s.id===setId);
    if(setObj){
      setObj.items = setObj.items.map(it=> it.id===itemId ? {...it, note, updatedAt: Date.now()} : it);
      saveLocal('vocabSets', setsLocal);
      toast.success('Đã lưu ghi chú!');
    }
  };

  const addWord = (kanji, kana, meaning) => {
    if(!selected) {
      toast.error('Vui lòng chọn bộ từ để thêm.');
      return;
    }
    if(!kanji || !kana || !meaning) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    const newItem = { id: 'w' + Date.now(), kanji, kana, meaning, note:'', updatedAt: Date.now()};
    setSets(prev => prev.map(s => s.id === selected.id ? {...s, items: [...s.items, newItem], updatedAt: Date.now()} : s));
    toast.success('Đã thêm từ mới!');
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Quản lý từ vựng</h2>

      <div className="flex space-x-2 mb-4">
        <button onClick={addSet} className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition">
          + Bộ mới
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Chọn bộ từ</label>
        <select value={selected ? selected.id : ''} onChange={e=>setSelected(sets.find(s=>s.id===e.target.value))} className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
          <option value="">-- Chọn một bộ từ --</option>
          {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {selected && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-2 flex justify-between items-center">
            {selected.name}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({selected.items.length} từ)</span>
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
            {selected.items.map(it=>(
              <div key={it.id} className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div>
                  <div className="font-medium">{it.kanji} <span className="text-sm text-gray-500 dark:text-gray-400">{it.kana}</span></div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{it.meaning}</div>
                </div>
              </div>
            ))}
          </div>
          <textarea value={paste} onChange={e=>setPaste(e.target.value)} className="w-full p-2 border rounded mt-3" rows={4} placeholder="Dán: Kanji | Kana | Nghĩa (mỗi dòng)"></textarea>
          <div className="flex space-x-2 mt-2">
            <button onClick={importPaste} className="px-3 py-1 bg-green-500 text-white rounded">Import</button>
          </div>
        </div>
      )}
    </div>
  );
}