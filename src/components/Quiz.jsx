import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function Quiz({ user, db }) {
  const [activeSetId, setActiveSetId] = useState(localStorage.getItem('activeSet') || '');
  const [sets, setSets] = useState(loadLocal('vocabSets', []));
  const [current, setCurrent] = useState(null);
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (activeSetId) {
      const setObj = sets.find(s => s.id === activeSetId);
      if (setObj && setObj.items.length > 0) {
        setCurrent(setObj.items[Math.floor(Math.random() * setObj.items.length)]);
      }
    }
  }, [activeSetId, sets]);

  const checkAnswer = () => {
    if (!current) return;
    if (answer.trim() === current.kana.trim()) {
      toast.success('Đúng rồi!');
      nextWord();
    } else {
      toast.error('Sai rồi, thử lại!');
      setShowAnswer(true);
    }
  };

  const nextWord = () => {
    setAnswer('');
    setShowAnswer(false);
    const setObj = sets.find(s => s.id === activeSetId);
    if (setObj && setObj.items.length > 0) {
      setCurrent(setObj.items[Math.floor(Math.random() * setObj.items.length)]);
    }
  };

  const handleNoteSave = async (note) => {
    const setsLocal = loadLocal('vocabSets', []);
    const setObj = setsLocal.find(s => s.id === activeSetId);
    if (!setObj) return;

    setObj.items = setObj.items.map(it =>
      it.id === current.id ? { ...it, note, updatedAt: Date.now() } : it
    );
    saveLocal('vocabSets', setsLocal);
    setSets(setsLocal);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { vocabSets: setsLocal }, { merge: true });
        toast.success('Đã lưu ghi chú và đồng bộ với Firebase!');
      } catch (error) {
        console.error("Lỗi khi đồng bộ ghi chú: ", error);
        toast.error('Có lỗi xảy ra khi đồng bộ dữ liệu.');
      }
    }
  };

  if (!activeSetId) return <p className="text-center">Chưa chọn bộ từ để luyện tập.</p>;
  if (!current) return <p className="text-center">Bộ từ này chưa có từ nào.</p>;

  return (
    <div className="p-4 bg-white rounded-xl shadow-md space-y-4">
      <h3 className="text-xl font-bold text-center">Luyện tập</h3>
      <div className="text-center">
        <p className="text-2xl font-bold">{current.kanji}</p>
        <p className="text-gray-600">{current.meaning}</p>
      </div>
      <input
        type="text"
        className="w-full p-2 border rounded-lg"
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Nhập cách đọc..."
        onKeyDown={e => e.key === 'Enter' && checkAnswer()}
      />
      <div className="flex space-x-2">
        <button
          onClick={checkAnswer}
          className="flex-1 bg-green-600 text-white py-2 rounded-lg shadow hover:bg-green-700"
        >
          Kiểm tra
        </button>
        <button
          onClick={nextWord}
          className="flex-1 bg-gray-500 text-white py-2 rounded-lg shadow hover:bg-gray-600"
        >
          Bỏ qua
        </button>
      </div>
      {showAnswer && (
        <p className="text-center text-red-600">
          Đáp án: {current.kana}
        </p>
      )}
      <textarea
        className="w-full p-2 border rounded-lg"
        placeholder="Thêm ghi chú..."
        defaultValue={current.note}
        onBlur={e => handleNoteSave(e.target.value)}
      />
    </div>
  );
}
