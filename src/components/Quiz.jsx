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
  const [isAutoNext, setIsAutoNext] = useState(false);

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

    // Sắp xếp theo độ khó (points thấp trước)
    const sortedItems = [...allItems].sort((a, b) => (a.points || 100) - (b.points || 100));

    // Lấy số từ cần học
    const wordsToLearn = sortedItems.slice(0, settings.perSession || 4);
    if (wordsToLearn.length === 0) {
      toast.info("Bộ từ này trống hoặc bạn đã thuộc tất cả các từ!");
      onFinish();
      return;
    }

    // Lặp lại mỗi từ 3 lần
    let quizItems = [];
    for (let i = 0; i < 3; i++) {
      quizItems = quizItems.concat(wordsToLearn);
    }

    // Xáo trộn
    const shuffledPool = quizItems.sort(() => 0.5 - Math.random());
    setPool(shuffledPool);
    setTimer(settings.timer);
    
  }, [activeSetId, sets, settings, onFinish]);

  const current = pool[index];

  // Sinh đáp án
  useEffect(() => {
    if (!current) return;
    const correctOption = current.meaning;
    const otherMeanings = sets.flatMap(s => s.items).map(item => item.meaning).filter(m => m !== correctOption);
    const shuffledOthers = otherMeanings.sort(() => 0.5 - Math.random()).slice(0, 3);
    const newOptions = [...shuffledOthers, correctOption].sort(() => 0.5 - Math.random());
    setOptions(newOptions);
    setShowAnswer(false);
    setSelected(null);
    setTimer(settings.timer);
  }, [current, sets, settings]);

  // Đếm ngược
  useEffect(() => {
    if (showAnswer) return;
    const countdown = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          handleSkip();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(countdown);
  }, [showAnswer, current]);

  // Lưu điểm từ
  const updateWordPoints = (word, isCorrect) => {
    const newPoints = (word.points || 100) + (isCorrect ? 10 : -20);
    
    const updatedSets = sets.map(s => {
      if (s.id === activeSetId) {
        return {
          ...s,
          items: s.items.map(item => {
            if (item.id === word.id) {
              return { ...item, points: newPoints };
            }
            return item;
          })
        };
      }
      return s;
    });
    
    setSets(updatedSets);
    if (user) {
      setDoc(doc(db, 'users', user.uid), { sets: updatedSets }, { merge: true }).catch(e => {
        console.error("Lỗi đồng bộ điểm từ: ", e);
      });
    }
  };

  // Khi chọn đáp án
  const handleAnswer = (option) => {
    setSelected(option);
    setShowAnswer(true);

    if (option === current.meaning) {
      setScore(prev => prev + 1); // dùng callback để tránh score cũ
      playAudio(current.kana);
      updateWordPoints(current, true);
      toast.success('Chính xác!', { autoClose: 1000 });
      setIsAutoNext(true); // bật cờ, để useEffect xử lý
    } else {
      updateWordPoints(current, false);
      toast.error('Sai rồi.', { autoClose: 1500 });
    }
  };

  // Auto next sau khi trả lời đúng
  useEffect(() => {
    if (isAutoNext) {
      const timer = setTimeout(() => {
        nextQuestion();
        setIsAutoNext(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isAutoNext]);

  const handleSkip = () => {
    setShowAnswer(true);
    updateWordPoints(current, false);
    toast.info('Bạn đã bỏ qua câu hỏi.', { autoClose: 1500 });
  };

  const nextQuestion = () => {
    if (index < pool.length - 1) {
      setIndex(prevIndex => prevIndex + 1);
      setTimer(settings.timer);
      setShowAnswer(false);
      setSelected(null);
    } else {
      onUpdatePoints(score);
      toast.success(`Bạn đã hoàn thành phiên học! Bạn đạt được ${score} điểm.`, { autoClose: 3000 });
      onFinish();
    }
  };

  const handleNoteSave = async (newNote) => {
    const updatedSets = sets.map(s => {
      if (s.id === activeSetId) {
        return {
          ...s,
          items: s.items.map(item => {
            if (item.id === current.id) {
              return { ...item, note: newNote };
            }
            return item;
          })
        };
      }
      return s;
    });

    setSets(updatedSets);
    saveLocal('vocabSets', updatedSets);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { sets: updatedSets }, { merge: true });
        toast.success('Đã lưu ghi chú!', { autoClose: 1500 });
      } catch (e) {
        console.error("Lỗi đồng bộ ghi chú: ", e);
      }
    }
  };

  if (pool.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 min-h-screen-minus-header">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
          <p className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Vui lòng chọn một bộ từ trong mục quản lý.</p>
          <button onClick={onFinish} className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700">Quay lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-8 min-h-screen-minus-header bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Thông tin hiển thị */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-4">
        <div className="text-lg font-bold text-gray-700 dark:text-gray-300">Score: {score}</div>
        <div className={`font-bold text-3xl ${timer <= 3 ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'}`}>{timer}s</div>
      </div>

      {/* ProgressBar */}
      <div className="w-full max-w-2xl bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
        <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(index / pool.length) * 100}%` }}></div>
      </div>
      
      {/* Question Card */}
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 mb-6 text-center transition-transform duration-300 ease-in-out">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-4">{current.kanji}</h2>
        {showAnswer && (
          <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">{current.kana}</p>
        )}
      </div>
      
      {/* Options */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => handleAnswer(opt)}
            disabled={showAnswer}
            className={`
              w-full p-4 text-lg rounded-lg shadow font-semibold transition
              ${showAnswer
                ? opt === current.meaning
                  ? 'bg-green-500 text-white'
                  : selected === opt
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                : 'bg-blue-600 text-white hover:bg-blue-700'}
            `}
          >
            {opt}
          </button>
        ))}
        {!showAnswer && (
          <button
            onClick={handleSkip}
            className="col-span-1 sm:col-span-2 p-4 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400"
          >
            Chưa biết
          </button>
        )}
      </div>

      {/* Đáp án + Ghi chú */}
      {showAnswer && (
        <div className="w-full max-w-2xl p-4 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner mt-6">
          <p className="font-semibold text-gray-900 dark:text-white">Đáp án:</p>
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{current.kana} - {current.meaning}</p>
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
      
      {/* Loading indicator cho auto next */}
      {isAutoNext && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl flex items-center space-x-3">
            <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg text-gray-800 dark:text-gray-200">Đang tự động chuyển câu hỏi...</p>
          </div>
        </div>
      )}
    </div>
  );
}
