import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { saveLocal } from '../utils/storage';
import { doc, setDoc } from 'firebase/firestore';

export default function Quiz({ sets, settings, onFinish, onUpdatePoints, user, db, updateWordItem }) {
  const [activeSetId, setActiveSetId] = useState(localStorage.getItem('activeSet') || '');
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);

  // Phát âm thanh tiếng Nhật
  const playAudio = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      speechSynthesis.speak(utterance);
    }
  };

  // Khởi tạo quiz
  useEffect(() => {
    const setObj = sets.find(s => s.id === activeSetId);
    if (!setObj || setObj.items.length === 0) {
      onFinish();
      return;
    }

    const allItems = setObj.items;
    const sortedItems = [...allItems].sort((a, b) => (a.points || 0) - (b.points || 0));

    let newPool = [];
    const perSession = settings.perSession || 10;
    while (newPool.length < perSession) {
      const remaining = perSession - newPool.length;
      const toAdd = sortedItems.slice(0, remaining > sortedItems.length ? sortedItems.length : remaining);
      newPool = [...newPool, ...toAdd];
      if (toAdd.length === 0) break;
    }
    
    for (let i = newPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPool[i], newPool[j]] = [newPool[j], newPool[i]];
    }

    setPool(newPool);
    setScore(0);
  }, [sets, activeSetId, onFinish, settings.perSession]);

  // Tạo đáp án trắc nghiệm khi câu hỏi thay đổi
  useEffect(() => {
    if (pool.length > 0 && index < pool.length) {
      const currentWord = pool[index];
      const otherWords = sets.find(s => s.id === activeSetId)?.items.filter(item => item.id !== currentWord.id) || [];
      
      const newOptions = [currentWord.meaning];
      while (newOptions.length < 4 && otherWords.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherWords.length);
        const randomMeaning = otherWords[randomIndex].meaning;
        if (!newOptions.includes(randomMeaning)) {
          newOptions.push(randomMeaning);
        }
        otherWords.splice(randomIndex, 1);
      }

      for (let i = newOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
      }
      setOptions(newOptions);
    }
  }, [pool, index]);

  // Chuyển sang câu hỏi tiếp theo
  const nextQuestion = () => {
    if (index < pool.length - 1) {
      setIndex(index + 1);
      setShowAnswer(false);
      setSelected(null);
    } else {
      toast.success("Bạn đã hoàn thành bài kiểm tra!");
      onFinish();
    }
  };

  // Xử lý khi người dùng chọn đáp án
  const handleAnswer = (answer, word) => {
    if (showAnswer) return;

    const isAnswerCorrect = answer === word.meaning;
    setSelected(answer);
    setShowAnswer(true);

    if (isAnswerCorrect) {
      toast.success('Chính xác!');
      setScore(score + 1);
      
      const newPoints = (word.points || 0) + 1;
      updateWordItem(activeSetId, word.id, { points: newPoints });
      onUpdatePoints(1);

      // Tự động chuyển câu hỏi sau 1 giây
      setTimeout(() => {
        nextQuestion();
      }, 1000);

    } else {
      toast.error('Không đúng. Thử lại!');
      
      const newPoints = Math.max(0, (word.points || 0) - 1);
      updateWordItem(activeSetId, word.id, { points: newPoints });
    }
  };

  const handleNoteSave = (e) => {
    const note = e.target.value;
    const currentWord = pool[index];
    if (!currentWord) return;

    updateWordItem(activeSetId, currentWord.id, { note: note });
    if (user) {
      toast.success('Đã lưu ghi chú và đồng bộ!');
    } else {
      toast.success('Đã lưu ghi chú!');
    }
  };

  if (pool.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        Đang chuẩn bị bài kiểm tra...
      </div>
    );
  }

  const current = pool[index];

  return (
    <div className="quiz-container p-4 max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg my-6">
      <div className="flex justify-between items-center mb-4 text-gray-700 dark:text-gray-300">
        <span>Câu hỏi: {index + 1}/{pool.length}</span>
        <span>Điểm: {score}</span>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900 rounded-lg p-6 mb-6 text-center shadow-inner">
        <h2 className="text-4xl font-bold text-indigo-800 dark:text-indigo-200">
          {current.kanji}
        </h2>
        <p className="text-xl mt-2 text-indigo-600 dark:text-indigo-400">{current.kana}</p>
        <button onClick={() => playAudio(current.kana)} className="mt-4 text-2xl text-indigo-500 hover:text-indigo-700 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.81 5 3.54 5 6.71s-2.11 5.9-5 6.71v2.06c4.01-.91 7-4.47 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(opt, current)}
            className={`p-4 rounded-lg font-semibold text-left transition-colors duration-200
              ${showAnswer ? 
                (opt === current.meaning ? 'bg-green-500 text-white' : 
                (opt === selected ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'))
                : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
              }`}
            disabled={showAnswer}
          >
            {opt}
          </button>
        ))}
      </div>

      {showAnswer && (
        <div className="mt-6 p-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Nghĩa:</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-2">{current.meaning}</p>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Ghi chú:</h3>
          <textarea
            className="w-full p-2 border rounded-lg mt-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            defaultValue={current.note}
            onBlur={handleNoteSave}
            placeholder="Thêm ghi chú..."
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={nextQuestion}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}