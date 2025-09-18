import React, { useState } from 'react';
import { collection, doc, setDoc, getDocs, updateDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

export default function VocabManager({ db, user, sets, setSets }){
  const [selected, setSelected] = useState(null);
  const [paste, setPaste] = useState('');

  // Lắng nghe cập nhật từ Firestore
  React.useEffect(() => {
    if (!user) return;
    const userVocabRef = collection(db, `artifacts/${__app_id}/users/${user.uid}/vocabSets`);
    const unsubscribe = onSnapshot(userVocabRef, (snapshot) => {
      const fetchedSets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSets(fetchedSets);
    });
    return () => unsubscribe();
  }, [user, db, setSets]);

  const addSet = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thêm bộ từ.');
      return;
    }
    const name = prompt('Tên bộ từ mới');
    if(!name) return;
    const newSetId = uuidv4();
    const newSet = { id: newSetId, name, items: [], updatedAt: Date.now() };
    const userVocabDocRef = doc(db, `artifacts/${__app_id}/users/${user.uid}/vocabSets/${newSetId}`);
    try{
      await setDoc(userVocabDocRef, newSet);
      toast.success('Đã thêm bộ từ thành công!');
    } catch(e) {
      console.error("Lỗi khi thêm bộ từ:", e);
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const importPaste = async () => {
    if(!selected) {
      toast.error('Vui lòng chọn bộ từ trước khi import.');
      return;
    }
    const lines = paste.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const newItems = [];
    for(const line of lines){
      const parts = line.split(/[;|,]/).map(p=>p.trim());
      if(parts.length >= 2){
        const kanji = parts[0] || '';
        const kana = parts[1] || '';
        const meaning = parts[2] || '';
        newItems.push({
          id: uuidv4(),
          kanji,
          kana,
          meaning,
          note: '',
          updatedAt: Date.now()
        });
      }
    }

    const updatedItems = [...selected.items, ...newItems];
    const userVocabDocRef = doc(db, `artifacts/${__app_id}/users/${user.uid}/vocabSets/${selected.id}`);
    
    try {
      await updateDoc(userVocabDocRef, {
        items: updatedItems,
        updatedAt: Date.now()
      });
      setSelected({ ...selected, items: updatedItems });
      setPaste('');
      toast.success('Đã import từ thành công!');
    } catch (e) {
      console.error("Lỗi khi import từ:", e);
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const deleteSet = async () => {
    if (!selected) {
      toast.error('Vui lòng chọn một bộ từ để xóa.');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa bộ từ "${selected.name}"?`)) {
      return;
    }
    const userVocabDocRef = doc(db, `artifacts/${__app_id}/users/${user.uid}/vocabSets/${selected.id}`);
    try {
      await deleteDoc(userVocabDocRef);
      setSelected(null);
      toast.success('Đã xóa bộ từ thành công!');
    } catch (e) {
      console.error("Lỗi khi xóa bộ từ:", e);
      toast.error('Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">Quản lý Từ vựng</h3>
          <button onClick={addSet} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200">
            Thêm bộ từ
          </button>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Chọn bộ từ</label>
          <select
            value={selected?.id || ''}
            onChange={e => setSelected(sets.find(s => s.id === e.target.value) || null)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          >
            <option value="">-- Chọn một bộ từ --</option>
            {sets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        
        {selected && (
          <div className="mt-4 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-2 flex justify-between items-center text-gray-800">
              {selected.name}
              <span className="text-sm font-normal text-gray-500">({selected.items.length} từ)</span>
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
              {selected.items.map(it => (
                <div key={it.id} className="flex justify-between items-center p-2 bg-white rounded-lg shadow-sm">
                  <div>
                    <div className="font-medium text-gray-900">{it.kanji} <span className="text-sm text-gray-500">{it.kana}</span></div>
                    <div className="text-sm text-gray-600">{it.meaning}</div>
                  </div>
                </div>
              ))}
            </div>
            <textarea
              value={paste}
              onChange={e => setPaste(e.target.value)}
              className="mt-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              rows={4}
              placeholder="Dán từ vựng ở đây. Mỗi từ một dòng, các trường ngăn cách bởi dấu phẩy hoặc chấm phẩy (Ví dụ: 食べる,たべる,Ăn)"
            ></textarea>
            <div className="mt-4 flex justify-end space-x-2">
              <button onClick={importPaste} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-200">
                Thêm từ đã dán
              </button>
              <button onClick={deleteSet} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-200">
                Xóa bộ từ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
