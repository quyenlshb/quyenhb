import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { doc, updateDoc } from 'firebase/firestore'; // Cập nhật import
import { toast } from 'react-toastify';

export default function VocabManager({ sets, setSets, user, db }){
  const [selected, setSelected] = useState(null);
  const [paste, setPaste] = useState('');

  const addSet = async () => {
    const name = prompt('Tên bộ từ mới');
    if (!name) return;
    const id = 'set_' + Date.now();
    const newSet = { id, name, items: [], updatedAt: Date.now() };

    const updatedSets = [...sets, newSet];
    setSets(updatedSets);
    saveLocal('vocabSets', updatedSets);
    
    // Đẩy thay đổi lên Firestore
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          vocabSets: updatedSets,
        });
        toast.success('Đã thêm bộ từ thành công và đồng bộ với Firebase!');
      } catch (e) {
        console.error("Lỗi khi thêm bộ từ vào Firestore: ", e);
        toast.error('Có lỗi xảy ra khi đồng bộ dữ liệu. Vui lòng thử lại.');
      }
    } else {
      toast.success('Đã thêm bộ từ thành công!');
    }
  };

  const importPaste = async () => { // Thêm async ở đây
    const lines = paste.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(!selected) {
      toast.error('Vui lòng chọn bộ từ trước khi import.');
      return;
    }
    const items = [];
    for(const line of lines){
      const parts = line.split(/[ -]/).map(p=>p.trim());
      if(parts.length >= 3){
        const kanji = parts[0];
        const kana = parts[1];
        const meaning = parts.slice(2).join(' ');
        items.push({ id: 'word_' + Date.now() + '_' + Math.random(), kanji, kana, meaning, note: '', updatedAt: Date.now() });
      }
    }

    const updatedSelected = {...selected, items: [...selected.items, ...items], updatedAt: Date.now()};
    const updatedSets = sets.map(s => s.id === updatedSelected.id ? updatedSelected : s);
    setSets(updatedSets);
    saveLocal('vocabSets', updatedSets);
    setPaste('');
    
    // Đẩy thay đổi lên Firestore
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          vocabSets: updatedSets,
        });
        toast.success('Đã nhập từ thành công và đồng bộ với Firebase!');
      } catch (e) {
        console.error("Lỗi khi nhập từ vào Firestore: ", e);
        toast.error('Có lỗi xảy ra khi đồng bộ dữ liệu. Vui lòng thử lại.');
      }
    } else {
      toast.success('Đã nhập từ thành công!');
    }
  };

  const startQuiz = () => {
    if(!selected) {
      toast.error('Vui lòng chọn một bộ từ để luyện tập!');
      return;
    }
    if(selected.items.length === 0){
      toast.error('Bộ từ này chưa có từ nào!');
      return;
    }
    localStorage.setItem('activeSet', selected.id);
    window.location.reload();
  };

  return (
    <div className='space-y-6'>
      <div className="p-4 bg-white rounded-xl shadow-md">
        <h3 className="text-xl font-bold mb-3">Quản lý bộ từ</h3>
        <button onClick={addSet} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-indigo-700 transition duration-300">
          Thêm bộ từ mới
        </button>
      </div>

      <div className="p-4 bg-white rounded-xl shadow-md">
        <h3 className="text-xl font-bold mb-3">Nhập/Luyện tập</h3>
        <label className="block mb-2 text-sm text-gray-600">Chọn bộ từ</label>
        <select onChange={e => setSelected(sets.find(s=>s.id===e.target.value))} value={selected?.id || ''} className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500">
          <option value="">-- Chọn một bộ từ --</option>
          {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={startQuiz} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-blue-700 transition duration-300 mt-4">
          Luyện tập với bộ từ này
        </button>
      </div>

      {selected && (
        <div className="p-4 bg-white rounded-xl shadow-md">
          <h3 className="text-xl font-bold mb-3 flex justify-between items-center">
            {selected.name}
            <span className="text-sm font-normal text-gray-500">({selected.items.length} từ)</span>
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
            {selected.items.map(it=>(
              <div key={it.id} className="p-2 bg-gray-50 rounded-lg shadow-sm">
                <div>
                  <div className="font-medium">{it.kanji} <span className="text-sm text-gray-500">{it.kana}</span></div>
                  <div className="text-sm text-gray-600">{it.meaning}</div>
                </div>
              </div>
            ))}\
          </div>
          <textarea value={paste} onChange={e=>setPaste(e.target.value)} className="w-full p-2 border rounded-lg mt-3" rows={4} placeholder="Dán các từ vào đây, mỗi dòng một từ, theo định dạng: Kanji Kana Nghĩa" />
          <button onClick={importPaste} className="w-full bg-gray-200 text-gray-800 font-bold py-3 rounded-lg shadow-md hover:bg-gray-300 transition duration-300 mt-2">
            Nhập từ
          </button>
        </div>
      )}
    </div>
  );
}