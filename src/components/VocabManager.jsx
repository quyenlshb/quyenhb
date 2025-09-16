import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { collection, doc, setDoc, getDocs, updateDoc } from 'firebase/firestore';

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
  };

  const importPaste = () => {
    const lines = paste.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(!selected) return alert('Chọn bộ trước');
    const items = [];
    for(const line of lines){
      const parts = line.split('|').map(p=>p.trim());
      if(parts.length<3){ alert('Dòng sai định dạng: '+line); return; }
      items.push({ id: 'w'+Date.now()+Math.random(), kanji: parts[0], kana: parts[1], meaning: parts[2], note:'', updatedAt: Date.now()});
    }
    setSets(prev => prev.map(s => s.id===selected.id ? {...s, items: [...s.items, ...items], updatedAt: Date.now() } : s));
    setPaste('');
  };

  const saveNote = (setId, wordId, note) => {
    setSets(prev => prev.map(s => s.id===setId ? {...s, items: s.items.map(w=> w.id===wordId ? {...w, note, updatedAt: Date.now()} : w)} : s));
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Quản lý bộ từ</h3>
        <button onClick={addSet} className="px-3 py-1 bg-blue-500 text-white rounded">+ Thêm bộ</button>
      </div>

      <div className="space-y-2">
        {sets.map(s=>(
          <div key={s.id} className="p-2 bg-white rounded shadow flex justify-between items-center">
            <div>{s.name}</div>
            <div className="space-x-2">
              <button className="px-2 py-1 bg-green-200" onClick={()=>setSelected(s)}>Mở</button>
              <button className="px-2 py-1 bg-red-200" onClick={()=>setSets(prev=>prev.filter(x=>x.id!==s.id))}>Xóa</button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="bg-white p-3 rounded shadow">
          <div className="font-semibold mb-2">Bộ: {selected.name}</div>
          <div className="space-y-2">
            {selected.items.map(it=>(
              <div key={it.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <div className="font-medium">{it.kanji} <span className="text-sm text-gray-500">{it.kana}</span></div>
                  <div className="text-sm text-gray-600">{it.meaning}</div>
                </div>
                <div className="space-y-1 text-right">
                  <button onClick={()=>{ const n = prompt('Ghi chú', it.note||''); if(n!==null) saveNote(selected.id, it.id, n); }} className="px-2 py-1 bg-yellow-200 rounded">Ghi chú</button>
                </div>
              </div>
            ))}
          </div>

          <textarea value={paste} onChange={e=>setPaste(e.target.value)} className="w-full p-2 border rounded mt-3" rows={4} placeholder="Dán: Kanji | Kana | Nghĩa (mỗi dòng)"></textarea>
          <div className="flex space-x-2 mt-2">
            <button onClick={importPaste} className="px-3 py-1 bg-green-500 text-white rounded">Import</button>
            <button onClick={()=>{ 
              const k = prompt('Kanji'); if(!k) return;
              const kana = prompt('Kana'); if(kana===null) return;
              const mean = prompt('Nghĩa'); if(mean===null) return;
              const item = { id: 'w'+Date.now(), kanji: k, kana, meaning: mean, note:'', updatedAt: Date.now()};
              setSets(prev => prev.map(s=> s.id===selected.id ? {...s, items:[...s.items, item], updatedAt: Date.now()} : s));
            }} className="px-3 py-1 bg-blue-500 text-white rounded">+ Thêm từ</button>
          </div>
        </div>
      )}
    </div>
  );
}
