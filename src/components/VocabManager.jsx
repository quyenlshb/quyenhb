import React, { useState } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { FaTrashAlt, FaEdit, FaPlus, FaPaste, FaExclamationCircle } from 'react-icons/fa';

export default function VocabManager({ sets, setSets, user, db }) {
  const [selected, setSelected] = useState(null);
  const [paste, setPaste] = useState('');
  const [selectedSetId, setSelectedSetId] = useState(localStorage.getItem('activeSet') || '');

  const syncToFirestore = async (updatedSets, successMsg) => {
    saveLocal('vocabSets', updatedSets);
    setSets(updatedSets);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { sets: updatedSets }, { merge: true });
        toast.success(successMsg + ' và đồng bộ với Firebase!');
      } catch (e) {
        console.error("Lỗi đồng bộ Firestore: ", e);
        toast.error('Có lỗi xảy ra khi đồng bộ dữ liệu.');
      }
    } else {
      toast.success(successMsg);
    }
  };

  const addSet = () => {
    const name = prompt('Tên bộ từ mới');
    if (!name) return;

    const id = 'set_' + Date.now();
    const newSet = { id, name, items: [], updatedAt: Date.now() };
    syncToFirestore([...sets, newSet], 'Đã thêm bộ từ thành công');
  };

  const deleteSet = (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bộ từ này?')) return;
    const updatedSets = sets.filter(s => s.id !== id);
    syncToFirestore(updatedSets, 'Đã xóa bộ từ thành công');
    if (selected && selected.id === id) {
      setSelected(null);
      setSelectedSetId('');
      localStorage.removeItem('activeSet');
    }
  };

  const importPaste = () => {
    if (!selected) {
      toast.error('Vui lòng chọn bộ từ trước khi import.');
      return;
    }

    const newWords = paste.split('\n').map(line => {
      const parts = line.split(' ');
      if (parts.length >= 3) {
        const kanji = parts[0];
        const kana = parts[1];
        const meaning = parts.slice(2).join(' ');
        const id = 'word_' + Date.now() + Math.random().toString(36).substr(2, 9);
        return { id, kanji, kana, meaning, note: '', points: 100 };
      }
      return null;
    }).filter(item => item);

    if (newWords.length === 0) {
      toast.error('Không tìm thấy từ nào hợp lệ.');
      return;
    }

    const updatedSets = sets.map(s => {
      if (s.id === selected.id) {
        return { ...s, items: [...s.items, ...newWords] };
      }
      return s;
    });

    syncToFirestore(updatedSets, 'Đã nhập từ thành công');
    setPaste('');
    handleSelectSet(updatedSets.find(s => s.id === selected.id)); // luôn sort lại
  };
  
  const handleSelectSet = (s) => {
    const sortedItems = [...s.items].sort((a, b) => (a.points || 100) - (b.points || 100));
    setSelected({ ...s, items: sortedItems });
    setSelectedSetId(s.id);
    localStorage.setItem('activeSet', s.id);
  };

  const deleteWord = (setId, wordId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa từ này?')) return;
    const updatedSets = sets.map(s => {
      if (s.id === setId) {
        return { ...s, items: s.items.filter(item => item.id !== wordId) };
      }
      return s;
    });
    syncToFirestore(updatedSets, 'Đã xóa từ thành công');
    handleSelectSet(updatedSets.find(s => s.id === setId));
  };

  const editWord = (setId, word) => {
    const newKanji = prompt('Chỉnh sửa Kanji:', word.kanji) || word.kanji;
    const newKana = prompt('Chỉnh sửa Kana:', word.kana) || word.kana;
    const newMeaning = prompt('Chỉnh sửa Nghĩa:', word.meaning) || word.meaning;
    const newNote = prompt('Chỉnh sửa Ghi chú:', word.note || '') || word.note;

    const updatedSets = sets.map(s => {
      if (s.id === setId) {
        return {
          ...s,
          items: s.items.map(item => {
            if (item.id === word.id) {
              return { ...item, kanji: newKanji, kana: newKana, meaning: newMeaning, note: newNote };
            }
            return item;
          })
        };
      }
      return s;
    });

    syncToFirestore(updatedSets, 'Đã cập nhật từ thành công');
    handleSelectSet(updatedSets.find(s => s.id === setId));
  };


  return (
    <div className="flex flex-col items-center p-4 md:p-8 min-h-screen-minus-header bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
        <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900 dark:text-white">Quản lý từ vựng</h2>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Các Bộ Từ</h3>
          <button onClick={addSet} className="bg-indigo-600 text-white p-2 rounded-full shadow hover:bg-indigo-700 transition">
            <FaPlus />
          </button>
        </div>

        {/* Danh sách các bộ từ */}
        <div className="space-y-3 mb-6">
          {sets.map(s => (
            <div
              key={s.id}
              onClick={() => handleSelectSet(s)}
              className={`p-4 rounded-xl shadow cursor-pointer transition-transform duration-200 ease-in-out hover:scale-[1.01]
                ${selectedSetId === s.id ? 'bg-indigo-100 dark:bg-indigo-900 border-2 border-indigo-500' : 'bg-gray-50 dark:bg-gray-700 border border-transparent'}
              `}
            >
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900 dark:text-white">{s.name} ({s.items.length} từ)</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSet(s.id); }}
                  className="p-2 text-red-500 hover:text-red-700 transition"
                >
                  <FaTrashAlt />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Import từ vựng */}
        {selected && (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl shadow-inner mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Thêm từ mới</h3>
            <textarea
              value={paste}
              onChange={e => setPaste(e.target.value)}
              className="w-full p-2 border rounded-lg mt-1 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              rows={4}
              placeholder="Dán các từ vào đây, mỗi dòng một từ, theo định dạng:\nKanji Kana Nghĩa"
            />
            <button
              onClick={importPaste}
              className="w-full mt-2 bg-indigo-600 text-white font-bold py-3 rounded-lg shadow-md hover:bg-indigo-700 transition"
            >
              <FaPaste className="inline-block mr-2" /> Nhập từ vựng
            </button>
          </div>
        )}

        {/* Danh sách từ chi tiết */}
        {selected && selected.items.length > 0 && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
              Từ vựng trong "{selected.name}" (sắp xếp theo điểm tăng dần)
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {selected.items.map(it => (
                <div 
                  key={it.id} 
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm flex justify-between items-center"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white flex items-center">
                      <span className="mr-2">{it.kanji}</span> 
                      <span className="text-sm text-gray-500 dark:text-gray-400">{it.kana}</span>
                      <span className="ml-3 px-2 py-1 text-xs font-semibold rounded bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
                        {it.points ?? 100} pts
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{it.meaning}</div>
                    {it.note && <div className="text-xs mt-1 text-gray-400">Ghi chú: {it.note}</div>}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button onClick={() => editWord(selected.id, it)} className="p-2 text-blue-500 hover:text-blue-700"><FaEdit /></button>
                    <button onClick={() => deleteWord(selected.id, it.id)} className="p-2 text-red-500 hover:text-red-700"><FaTrashAlt /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {selected && selected.items.length === 0 && (
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center">
              <FaExclamationCircle className="text-yellow-500 text-3xl mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">Bộ từ này chưa có từ nào. Hãy dán từ vào khung bên trên để bắt đầu.</p>
          </div>
        )}
      </div>
    </div>
  );
}
