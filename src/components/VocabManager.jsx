import React, { useState, useEffect } from 'react';
import { db, auth } from "../firebase";
import { collection, addDoc, setDoc, doc, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';

export default function VocabManager(){
  const [sets, setSets] = useState([]);
  const [newSetName, setNewSetName] = useState('');
  const [importText, setImportText] = useState('');
  const user = auth.currentUser;

  useEffect(() => {
    if(!user) return;

    // Load from localStorage first
    const localData = localStorage.getItem('vocabSets');
    if(localData){
      setSets(JSON.parse(localData));
    }

    // Realtime listener from Firestore
    const colRef = collection(db, 'users', user.uid, 'vocabSets');
    const unsub = onSnapshot(colRef, snapshot => {
      const serverData = snapshot.docs.map(d => ({id:d.id, ...d.data()}));
      setSets(serverData);
      localStorage.setItem('vocabSets', JSON.stringify(serverData));
    });

    return () => unsub();
  }, [user]);

  const addSet = async () => {
    if(!newSetName.trim()) return;
    const setData = {title:newSetName.trim(), createdAt:Date.now(), words:[]};
    if(user){
      await addDoc(collection(db, 'users', user.uid, 'vocabSets'), setData);
    }
    setNewSetName('');
  };

  const deleteSet = async (id) => {
    if(user){
      await deleteDoc(doc(db, 'users', user.uid, 'vocabSets', id));
    }
  };

  const importWords = async (setId) => {
    if(!importText.trim()) return;
    const lines = importText.split('\n');
    const words = lines.map(line=>{
      const parts = line.split(/\s*\|\s*|\t+|\s{2,}/).map(p=>p.trim()).filter(Boolean);
      return {kanji:parts[0]||'', kana:parts[1]||'', meaning:parts[2]||'', note:''};
    });
    if(user){
      const setRef = doc(db, 'users', user.uid, 'vocabSets', setId);
      await setDoc(setRef, {words}, {merge:true});
    }
    setImportText('');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-3">Quản lý bộ từ</h2>
      <div className="flex space-x-2 mb-3">
        <input value={newSetName} onChange={e=>setNewSetName(e.target.value)} placeholder="Tên bộ từ" className="border p-2 rounded w-full"/>
        <button onClick={addSet} className="px-3 py-2 bg-blue-500 text-white rounded">Thêm</button>
      </div>
      {sets.map(set=>(
        <div key={set.id} className="mb-4 p-3 border rounded bg-white shadow">
          <div className="flex justify-between items-center mb-2">
            <div className="font-semibold">{set.title}</div>
            <button onClick={()=>deleteSet(set.id)} className="text-red-600">Xóa</button>
          </div>
          <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Dán từ vựng vào đây (Kanji Kana Nghĩa)" className="border p-2 rounded w-full mb-2"/>
          <button onClick={()=>importWords(set.id)} className="px-3 py-2 bg-green-500 text-white rounded">Nhập</button>
        </div>
      ))}
    </div>
  );
}
