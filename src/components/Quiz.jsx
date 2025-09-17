import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { doc, updateDoc } from 'firebase/firestore';
import { FaPlay } from 'react-icons/fa'; // Đảm bảo dòng này đã được import đúng

export default function Quiz({ sets, settings, onFinish, user, db }) {
  const [activeSetId, setActiveSetId] = useState(null);
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(settings.timer);
  const [showNote, setShowNote] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  const playKana = () => {
    if (pool.length > 0 && 'speechSynthesis' in window) {
      const current = pool[index];
      const utter = new SpeechSynthesisUtterance(current.kana);
      utter.lang = 'ja-JP';
      window.speechSynthesis.speak(utter);
    }
  };

  const generateQuiz = (setId) => {
    const activeSet = sets.find(s => s.id === setId);
    if (!activeSet || activeSet.items.length === 0) {
      toast.error('Bộ từ này không có từ nào để luyện tập.');
      return;
    }
    const sortedWords = activeSet.items.sort((a, b) => a.masteryLevel - b.masteryLevel);
    const quizPool = sortedWords.slice(0, settings.perSession);
    
    setPool(quizPool);
    setActiveSetId(setId);
    setIndex(0);
    setCorrectAnswers(0);
    setShowNote(false);
    setSelected(null);
    if (quizPool.length > 0) {
      generateOptions(quizPool[0]);
    }
  };

  const generateOptions = (current) => {
    const allItems = sets.flatMap(s => s.items);
    const incorrectItems = allItems.filter(item => item.id !== current.id);
    const shuffledIncorrect = incorrectItems.sort(() => 0.5 - Math.random());
    const randomOptions = shuffledIncorrect.slice(0, 3).map(i => i.meaning);
    const newOptions = [...randomOptions, current.meaning];
    setOptions(newOptions.sort(() => 0.5 - Math.random()));
  };

  const handleAnswer = (answer) => {
    setSelected(answer);
    if (answer === pool[index].meaning) {
      setCorrectAnswers(correctAnswers + 1);
      setShowNote(false);
      
      const newMasteryLevel = (pool[index].masteryLevel || 0) + 1;
      updateWordMastery(pool[index].id, newMasteryLevel);
      playKana(); // Play audio on correct answer

      setTimeout(() => {
        nextQuestion();
      }, 500);
    } else {
      setShowNote(true);
      const newMasteryLevel = Math.max(0, (pool[index].masteryLevel || 0) - 1);
      updateWordMastery(pool[index].id, newMasteryLevel);
    }
    
    // Stop timer
    setTimer(settings.timer);
  };
  
  const updateWordMastery = async (wordId, newMasteryLevel) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'vocabData', user.uid);
      const updatedSets = sets.map(s => {
        if (s.id === activeSetId) {
          s.items = s.items.map(item => {
            if (item.id === wordId) {
              return { ...item, masteryLevel: newMasteryLevel, lastReviewedAt: Date.now() };
            }
            return item;
          });
        }
        return s;
      });
      await updateDoc(userDocRef, { sets: updatedSets });
    } catch(e) {
      console.error("Lỗi khi cập nhật mastery level: ", e);
      toast.error("Lỗi khi cập nhật tiến độ.");
    }
  };

  const saveNote = async (newNote) => {
    if (!user || !selected) return;
    try {
      const userDocRef = doc(db, 'vocabData', user.uid);
      const updatedSets = sets.map(s => {
        if (s.id === activeSetId) {
          s.items = s.items.map(item => {
            if (item.id === pool[index].id) {
              return { ...item, note: newNote, updatedAt: Date.now() };
            }
            return item;
          });
        }
        return s;
      });
      await updateDoc(userDocRef, { sets: updatedSets });
      toast.success('Đã lưu ghi chú!');
    } catch(e) {
      console.error("Lỗi khi lưu ghi chú: ", e);
      toast.error("Lỗi khi lưu ghi chú!");
    }
  };

  const nextQuestion = () => {
    setSelected(null);
    setShowNote(false);
    if (index + 1 < pool.length) {
      setIndex(index + 1);
      generateOptions(pool[index + 1]);
      setTimer(settings.timer);
    } else {
      onFinish(correctAnswers);
    }
  };

  useEffect(() => {
    if (pool.length > 0 && timer > 0 && selected === null) {
      const countdown = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
      return () => clearInterval(countdown);
    } else if (timer === 0 && selected === null) {
      handleAnswer(''); // Simulate wrong answer on timeout
    }
  }, [pool, timer, selected]);

  if (sets.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Vui lòng thêm bộ từ trong trang Quản lý Từ vựng.</p>
      </div>
    );
  }

  if (pool.length === 0) {
    return (
      <div className="p-4 text-center">
        <h3 className="text-xl font-bold mb-4">Chọn bộ từ để luyện tập</h3>
        <div className="space-y-3">
          {sets.map(s => (
            <button key={s.id} onClick={() => generateQuiz(s.id)} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition">
              {s.name} ({s.items.length} từ)
            </button>
          ))}
        </div>
      </div>
    );
  }

  const current = pool[index];
  const progress = ((index + 1) / pool.length) * 100;
  
  return (
    <div className="p-4">
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="text-center mb-4">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Câu {index + 1} / {pool.length}</span>
        <span className="ml-4 text-sm font-medium text-red-500">Time: {timer}s</span>
      </div>
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center">
        <h3 className="text-4xl font-bold mb-4">
          {current.kanji}
        </h3>
        <button onClick={playKana} className="text-xl p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            <FaPlay />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {options.map(o => (
          <button
            key={o}
            onClick={() => handleAnswer(o)}
            className={`p-4 rounded-lg font-semibold text-lg transition ${selected ? (o === current.meaning ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300') : 'bg-blue-500 text-white hover:bg-blue-600'} `}
            disabled={selected !== null}
          >
            {o}
          </button>
        ))}
      </div>

      {showNote && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-inner">
          <div className="text-lg font-semibold">
              Đáp án đúng là:
              <span className="font-bold"> {current.kanji} ({current.kana}) - {current.meaning}</span>
          </div>
          <textarea
            defaultValue={current.note}
            onBlur={(e) => saveNote(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg mt-3 text-gray-800 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Thêm ghi chú cá nhân..."
          ></textarea>
          <div className="flex justify-end mt-2">
            <button onClick={nextQuestion} className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
              Tiếp theo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}