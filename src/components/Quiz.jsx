import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function Quiz({ sets, settings, onFinish, onUpdatePoints, user, db, setSets }) {
  const [activeSetId, setActiveSetId] = useState(localStorage.getItem('activeSet') || '');
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(settings.timer || 15);
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

    // Sắp xếp các từ theo điểm số (ưu tiên từ khó - điểm thấp)
    const sortedItems = [...allItems].sort((a, b) => (a.points || 0) - (b.points || 0));
    const selectedItems = sortedItems.slice(0, settings.perSession);

    const quizPool = selectedItems.map(item => ({
      ...item,
      options: generateOptions(item, allItems)
    }));

    setPool(quizPool);
    setIndex(0);
    setScore(0);
    setShowAnswer(false);
    setSelected(null);
  }, [activeSetId, sets, settings.perSession, onFinish]);

  useEffect(() => {
    let interval;
    if (settings.timer && !showAnswer) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [showAnswer, settings.timer]);

  // Sinh các đáp án
  const generateOptions = (correctItem, allItems) => {
    const otherItems = allItems.filter(item => item.id !== correctItem.id);
    const shuffledOthers = otherItems.sort(() => 0.5 - Math.random());
    const wrongOptions = shuffledOthers.slice(0, 3).map(item => item.meaning);
    const allOptions = [...wrongOptions, correctItem.meaning];
    return allOptions.sort(() => 0.5 - Math.random());
  };

  // Cập nhật điểm
  const updateWordPoints = (word, isCorrect) => {
    const updatedSets = sets.map(set => {
      if (set.id === activeSetId) {
        const updatedItems = set.items.map(item => {
          if (item.id === word.id) {
            const currentPoints = item.points || 0;
            const newPoints = isCorrect ? currentPoints + 1 : Math.max(0, currentPoints - 1);
            onUpdatePoints(isCorrect);
            return { ...item, points: newPoints };
          }
          return item;
        });
        return { ...set, items: updatedItems };
      }
      return set;
    });
    setSets(updatedSets);

    if (user) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, { sets: updatedSets }, { merge: true });
    } else {
      saveLocal('vocabSets', updatedSets);
    }
  };

  // Chuyển sang câu hỏi tiếp theo
  const nextQuestion = () => {
    setTimer(settings.timer || 15);
    setShowAnswer(false);
    setSelected(null);
    setIndex(prev => prev + 1);
  };

  // Xử lý khi trả lời
  const handleAnswer = (option) => {
    setSelected(option);
    setShowAnswer(true);
    if (option === pool[index].meaning) {
      setScore(score + 1);
      playAudio(pool[index].kana);
      updateWordPoints(pool[index], true);
      toast.success('Chính xác!', { autoClose: 1000 });
      // Thêm đoạn mã này để tự động chuyển câu hỏi
      setTimeout(() => {
        nextQuestion();
      }, 1500);
    } else {
      updateWordPoints(pool[index], false);
      toast.error('Sai rồi.', { autoClose: 1500 });
    }
  };

  const handleTimeout = () => {
    setShowAnswer(true);
    updateWordPoints(pool[index], false);
    toast.error('Hết giờ.', { autoClose: 1500 });
    setTimeout(() => {
      nextQuestion();
    }, 1500);
  };

  if (pool.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Không có từ vựng nào để luyện tập.</h2>
        <button onClick={onFinish} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">Quay về</button>
      </div>
    );
  }

  const current = pool[index];
  const progress = Math.min(100, ((index + 1) / pool.length) * 100);

  return (
    <div className="p-4 md:p-8 rounded-xl shadow-md max-w-2xl mx-auto bg-white dark:bg-gray-800 transition-colors duration-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Câu hỏi {index + 1} / {pool.length}</h2>
        <span className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
          Điểm: {score}
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-6">
        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="flex flex-col items-center">
        <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-inner mb-4 w-full text-center">
          <h3 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{current.kanji}</h3>
          <p className="text-xl text-gray-700 dark:text-gray-300">{current.kana}</p>
        </div>

        {settings.timer && !showAnswer && (
          <div className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
            Thời gian: {timer}s
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {current.options.map((option, i) => (
            <button
              key={i}
              onClick={() => !showAnswer && handleAnswer(option)}
              disabled={showAnswer}
              className={`
                p-4 rounded-lg font-semibold text-left transition transform hover:scale-105
                ${showAnswer
                  ? option === current.meaning
                    ? 'bg-green-500 text-white shadow-lg'
                    : option === selected
                      ? 'bg-red-500 text-white opacity-70 shadow-lg'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 opacity-50 cursor-not-allowed'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                }
              `}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {showAnswer && (
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner">
          <p className="font-bold text-gray-900 dark:text-white">Đáp án đúng: <span className="text-green-600 dark:text-green-400">{current.meaning}</span></p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Nghĩa: {current.meaning}</p>
          <textarea
            className="w-full p-2 border rounded-lg mt-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            defaultValue={current.note}
            onBlur={e => handleNoteSave(e.target.value)}
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