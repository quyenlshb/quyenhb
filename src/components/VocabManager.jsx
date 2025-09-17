import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

export default function VocabManager({ db, user }) {
  const [sets, setSets] = useState(() => loadLocal('vocabSets', []));
  const [selected, setSelected] = useState(null);
  const [paste, setPaste] = useState('');
  const [newWord, setNewWord] = useState({ kanji: '', kana: '', meaning: '' });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    saveLocal('vocabSets', sets);
  }, [sets]);

  const handleSelectSet = (e) => {
    const setId = e.target.value;
    const selectedSet = sets.find(s => s.id === setId);
    setSelected(selectedSet);
    setPaste('');
  };

  const addSet = async () => {
    const name = prompt('Tên bộ từ mới');
    if (!name) return;
    const id = 'set_' + Date.now();
    const ns = { id, name, items: [], updatedAt: Date.now() };
    setSets(s => [...s, ns]);
    if (navigator.onLine && user) {
      try {
        await setDoc(doc(db, 'vocabSets', id), ns);
      } catch (e) {
        console.error('Lỗi khi thêm bộ từ vào Firestore:', e);
        toast.error('Lỗi: không thể đồng bộ bộ từ với server.');
      }
    }
    toast.success('Đã thêm bộ từ thành công!');
  };

  const deleteSet = async () => {
    if (!selected || !window.confirm(`Bạn có chắc chắn muốn xóa bộ từ "${selected.name}"?`)) return;
    const filteredSets = sets.filter(s => s.id !== selected.id);
    setSets(filteredSets);
    if (navigator.onLine && user) {
      try {
        await deleteDoc(doc(db, 'vocabSets', selected.id));
      } catch (e) {
        console.error('Lỗi khi xóa bộ từ khỏi Firestore:', e);
        toast.error('Lỗi: không thể đồng bộ xóa bộ từ với server.');
      }
    }
    setSelected(null);
    toast.success('Đã xóa bộ từ thành công!');
  };

  const saveUpdatedSet = async (updatedItems) => {
    const newSets = sets.map(s => s.id === selected.id ? { ...s, items: updatedItems, updatedAt: Date.now() } : s);
    setSets(newSets);
    if (navigator.onLine && user) {
      try {
        await updateDoc(doc(db, 'vocabSets', selected.id), {
          items: updatedItems,
          updatedAt: Date.now()
        });
      } catch (e) {
        console.error('Lỗi khi đồng bộ dữ liệu với Firestore:', e);
        toast.error('Lỗi: không thể đồng bộ dữ liệu từ vựng với server.');
      }
    }
    setSelected(s => ({ ...s, items: updatedItems }));
  };

  const importPaste = () => {
    const lines = paste.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!selected) {
      toast.error('Vui lòng chọn bộ từ trước khi import.');
      return;
    }
    const newItems = [];
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length < 3) continue;
      newItems.push({
        id: `word_${Date.now()}_${Math.random()}`,
        kanji: parts[0],
        kana: parts[1],
        meaning: parts[2],
        note: '',
        createdAt: Date.now()
      });
    }
    const updatedItems = [...selected.items, ...newItems];
    saveUpdatedSet(updatedItems);
    setPaste('');
    toast.success('Đã import từ thành công!');
  };

  const handleAddWord = () => {
    if (!selected) {
      toast.error('Vui lòng chọn bộ từ trước khi thêm từ mới.');
      return;
    }
    if (!newWord.kanji || !newWord.kana || !newWord.meaning) {
      toast.error('Vui lòng điền đầy đủ thông tin cho từ mới.');
      return;
    }
    const wordToAdd = {
      id: `word_${Date.now()}_${Math.random()}`,
      ...newWord,
      note: '',
      createdAt: Date.now()
    };
    const updatedItems = [...selected.items, wordToAdd];
    saveUpdatedSet(updatedItems);
    setNewWord({ kanji: '', kana: '', meaning: '' });
    toast.success('Đã thêm từ mới!');
  };

  const deleteItem = (itemId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa từ này?')) return;
    const updatedItems = selected.items.filter(item => item.id !== itemId);
    saveUpdatedSet(updatedItems);
    toast.success('Đã xóa từ!');
  };
  
  const handleEditName = () => {
    if (!selected) return;
    setIsEditingName(true);
    setEditedName(selected.name);
  };

  const saveEditedName = async () => {
    if (!editedName) {
        toast.error('Tên bộ từ không được để trống.');
        return;
    }
    const newSets = sets.map(s => s.id === selected.id ? { ...s, name: editedName, updatedAt: Date.now() } : s);
    setSets(newSets);
    if (navigator.onLine && user) {
        try {
            await updateDoc(doc(db, 'vocabSets', selected.id), {
                name: editedName,
                updatedAt: Date.now()
            });
        } catch (e) {
            console.error('Lỗi khi cập nhật tên bộ từ vào Firestore:', e);
            toast.error('Lỗi: không thể đồng bộ tên bộ từ với server.');
        }
    }
    setSelected(s => ({ ...s, name: editedName }));
    setIsEditingName(false);
    toast.success('Đã đổi tên bộ từ thành công!');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <button onClick={addSet} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition shadow">
          Thêm bộ từ mới
        </button>
        {selected && (
          <button onClick={deleteSet} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow">
            Xóa bộ từ đang chọn
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <label className="block text-sm font-medium mb-1">Chọn bộ từ</label>
        <select onChange={handleSelectSet} className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:border-blue-500">
          <option value="">-- Chọn một bộ từ --</option>
          {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {selected && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
          <div className="flex justify-between items-center">
            {isEditingName ? (
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="p-1 border rounded-md"
                    />
                    <button onClick={saveEditedName} className="text-green-500"><FaCheck /></button>
                    <button onClick={() => setIsEditingName(false)} className="text-red-500"><FaTimes /></button>
                </div>
            ) : (
                <h3 className="text-lg font-bold flex items-center space-x-2">
                    <span>{selected.name}</span>
                    <button onClick={handleEditName} className="text-gray-500 hover:text-indigo-600 transition"><FaEdit /></button>
                </h3>
            )}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({selected.items.length} từ)</span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
            {selected.items.length === 0 ? (
                <div className="text-center text-gray-500">Chưa có từ nào.</div>
            ) : (
                selected.items.map(it => (
                    <div key={it.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm">
                      <div>
                        <div className="font-medium">{it.kanji} <span className="text-sm text-gray-500 dark:text-gray-400">{it.kana}</span></div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{it.meaning}</div>
                      </div>
                      <button onClick={() => deleteItem(it.id)} className="text-red-500 hover:text-red-700 transition">
                          <FaTrash />
                      </button>
                    </div>
                ))
            )}
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Thêm từ mới</h4>
            <div className="space-y-2">
                <input
                    type="text"
                    placeholder="Kanji"
                    value={newWord.kanji}
                    onChange={(e) => setNewWord({ ...newWord, kanji: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                />
                <input
                    type="text"
                    placeholder="Kana"
                    value={newWord.kana}
                    onChange={(e) => setNewWord({ ...newWord, kana: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                />
                <input
                    type="text"
                    placeholder="Nghĩa"
                    value={newWord.meaning}
                    onChange={(e) => setNewWord({ ...newWord, meaning: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                />
                <button onClick={handleAddWord} className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition shadow">
                    Thêm từ
                </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">Import từ</h4>
            <textarea
              value={paste}
              onChange={e => setPaste(e.target.value)}
              className="w-full p-2 border rounded-lg resize-y"
              rows={4}
              placeholder="Dán các từ vào đây, mỗi từ một dòng với định dạng: Kanji | Kana | Nghĩa"
            ></textarea>
            <button onClick={importPaste} className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition shadow">
              Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}