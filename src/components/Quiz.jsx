import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FaVolumeUp } from 'react-icons/fa';

export default function Quiz({ pool, activeSetId, onFinish, updateWordItem, sets, user, db }) {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);
  const [score, setScore] = useState(0);

  const current = pool[index];
  const allItems = sets.find(s => s.id === activeSetId)?.items || [];

  // Hàm tạo đáp án trắc nghiệm, chỉ chạy khi có từ mới
  const generateOptions = useCallback((currentWord, allItems) => {
    const wrongAnswers = allItems
      .filter(item => item.id !== currentWord.id)
      .map(item => item.meaning);

    const shuffled = wrongAnswers.sort(() => 0.5 - Math.random());
    const newOptions = [currentWord.meaning, ...shuffled.slice(0, 3)];

    // Trộn ngẫu nhiên 1 lần duy nhất khi tạo
    return newOptions.sort(() => 0.5 - Math.random());
  }, []);

  // Effect để khởi tạo đáp án khi câu hỏi thay đổi
  useEffect(() => {
    if (pool.length > 0 && index < pool.length) {
      setOptions(generateOptions(pool[index], allItems));
      setShowAnswer(false);
      setSelected(null);
    }
  }, [index, pool, generateOptions, allItems]);

  const playAudio = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };

  const handleAnswer = (option) => {
    setSelected(option);
    setShowAnswer(true);

    const isCorrect = option === current.meaning;
    const newPoints = isCorrect ? (current.points || 100) + 10 : Math.max(0, (current.points || 100) - 10);
    const newScore = isCorrect ? score + 1 : score;

    setScore(newScore);
    updateWordItem(activeSetId, current.id, { points: newPoints });

    setTimeout(() => {
      if (index < pool.length - 1) {
        setIndex(prev => prev + 1);
      } else {
        toast.success(`Bạn đã hoàn thành quiz! Điểm số: ${newScore}/${pool.length}`);
        onFinish();
      }
    }, 2000);
  };

  const handleNoteSave = async (e) => {
    const newNote = e.target.value;
    updateWordItem(activeSetId, current.id, { note: newNote });
    toast.success("Ghi chú đã được lưu!");
  };

  // Xử lý trường hợp không có từ vựng
  if (!current) {
    return (
      <div className="flex justify-center items-center h-full p-4">
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <p className="text-gray-600 dark:text-gray-400">Không có từ vựng để kiểm tra.</p>
            <button onClick={onFinish} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Quay lại
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen-minus-header flex flex-col justify-center items-center bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 text-center">
        <div className="text-gray-500 dark:text-gray-400 mb-4">
          Câu hỏi {index + 1} / {pool.length}
        </div>
        <div className="flex flex-col items-center justify-center mb-6">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-2">{current.kanji}</h2>
          <p className="text-2xl text-gray-700 dark:text-gray-300 mb-4">{current.kana}</p>
          <button onClick={() => playAudio(current.kana)} className="p-2 text-xl text-indigo-600 hover:text-indigo-800">
            <FaVolumeUp />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              className={`
                p-4 rounded-lg font-semibold transition
                ${showAnswer
                  ? opt === current.meaning
                    ? 'bg-green-500 text-white'
                    : opt === selected
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
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
          </div>
        )}
      </div>
    </div>
  );
}