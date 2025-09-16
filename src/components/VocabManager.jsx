// src/components/VocabManager.jsx
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

const VocabManager = () => {
  const [vocabs, setVocabs] = useState([]);
  const [input, setInput] = useState("");

  const fetchVocab = async () => {
    const snapshot = await getDocs(collection(db, "vocabs"));
    setVocabs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const addVocab = async () => {
    if (!input.trim()) return;
    const [kanji, kana, meaning] = input.split(/\s+/);
    await addDoc(collection(db, "vocabs"), { kanji, kana, meaning, note: "" });
    setInput("");
    fetchVocab();
  };

  const deleteVocab = async (id) => {
    await deleteDoc(doc(db, "vocabs", id));
    fetchVocab();
  };

  useEffect(() => {
    fetchVocab();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Quản lý từ vựng</h2>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Dán từ: Kanji Kana Nghĩa"
        className="w-full p-2 border rounded mb-2"
      />
      <button
        onClick={addVocab}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Thêm từ
      </button>

      <ul className="mt-4">
        {vocabs.map((v) => (
          <li key={v.id} className="flex justify-between items-center p-2 border-b">
            <span>{v.kanji} ({v.kana}) - {v.meaning}</span>
            <button
              onClick={() => deleteVocab(v.id)}
              className="text-red-500"
            >
              Xóa
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VocabManager;
