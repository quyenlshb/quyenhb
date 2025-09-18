import React, { useState, useEffect } from 'react';
import { loadLocal, saveLocal } from '../utils/storage';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function Quiz({ sets, settings, onFinish, onUpdatePoints, user, db }) {
  const [activeSetId, setActiveSetId] = useState(localStorage.getItem('activeSet') || '');
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(0);
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
    if (setObj && setObj.items.length > 0) {
      const shuffled = [...setObj.items].sort(() => 0.5 - Math.random());
      setPool(shuffled.slice(0, settings.perSession || 10));
      setTimer(settings.timer || 15);
    } else {
      onFinish();
    }
  }, [activeSetId, sets, settings, onFinish]);

  // Countdown timer
  useEffect(() => {
    if (!pool.length || showAnswer) return;
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setShowAnswer(true);
    }
  }, [timer, showAnswer, pool]);

  // Sinh đáp án (4 lựa chọn)
  useEffect(() => {
    if (!pool.length) return;
    const current = pool[index];
    const allMeanings = sets.flatMap(s => s.items).map(it => it.meaning);
    const fake = allMeanings.filter(m => m !== current.meaning).sort(() => 0.5 - Math.random()).slice(0, 3);
    setOptions([...fake, current.meaning].sort(() => 0.5 - Math.random()));
  }, [index, pool, sets]);

  const handleSelect = (opt) => {
    setSelected(opt);
    setShowAnswer(true);
    if (opt === pool[index].meaning) {
      setScore(score + 1);
      onUpdatePoints(1);
      toast.success('Chính xác!');
      playAudio(pool[index].kanji || pool[index].kana);
      setTimeout(() => nextQuestion(), 1500);
    } else {
      toast.error('Sai rồi!');
    }
  };

  const nextQuestion = () => {
    if (index + 1 < pool.length) {
      setIndex(index + 1);
      setTimer(settings.timer || 15);
      setShowAnswer(false);
      setSelected(null);
    } else {
      onFinish();
      localStorage.removeItem('activeSet');
    }
  };

  const handleSkip = () => setShowAnswer(true);

  const handleNoteSave = async (note) => {
    const setsLocal = loadLocal('vocabSets', []);
    const setObj = setsLocal.find(s => s.id === activeSetId);
    if (!setObj) return;

    setObj.items = setObj.items.map(it =>
      it.id === pool[index].id ? { ...it, note, updatedAt: Date.now() } : it
    );
    saveLocal('vocabSets', setsLocal);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { vocabSets: setsLocal }, { merge: true });
        toast.success('Đã lưu ghi chú!');
      } catch (e) {
        console.error("Lỗi đồng bộ:", e);
        toast.error('Không thể đồng bộ dữ liệu.');
      }
    }
  };

  if (!pool.length) {
    return <p className="text-center">Không có từ để luyện tập.</p>;
  }

  const current = pool[index];
  const progressPercent = Math.round(((index + 1) / pool.length) * 100);

  return (
    <div className="space-y-6">
      {/* Thanh điểm & progress */}
      <div className="p-4 bg-white rounded-xl shadow flex justify-between items-center">
        <div className="text-lg font-bold text-indigo-600">Điểm: {score}</div>
        <div className="w-2/3 bg-gray-200 h-3 rounded-full overflow-hidden">
          <div
            className="bg-green-500 h-3"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-600 ml-2">
          {index + 1}/{pool.length}
        </div>
      </div>

      {/* Thông tin câu hỏi */}
      <div className="p-4 bg-white rounded-xl shadow text-center">
        <div className="text-3xl font-bold text-indigo-600 my-3">{current.kanji}</div>
        <div className="text-lg text-gray-500 mb-2">{current.kana}</div>
        {!showAnswer && (
          <div className="text-lg text-gray-700">⏱ {timer}s</div>
        )}
      </div>

      {/* Lựa chọn đáp án */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => handleSelect(opt)}
            disabled={showAnswer}
            className={`p-4 rounded-lg shadow font-semibold transition 
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
        <div className="p-4 bg-gray-100 rounded-lg shadow-inner">
          <p className="font-semibold">Đáp án:</p>
          <p className="text-lg font-bold">{current.kana} - {current.meaning}</p>
          <textarea
            className="w-full p-2 border rounded-lg mt-3"
            defaultValue={current.note}
            onBlur={e => handleNoteSave(e.target.value)}
            placeholder="Thêm ghi chú..."
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={nextQuestion}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
            >
              Tiếp theo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
