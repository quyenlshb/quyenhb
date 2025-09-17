import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { FaPlay, FaArrowLeft } from 'react-icons/fa';

export default function Quiz({ sets, settings, onFinish, user, db }) {
  const [activeSetId, setActiveSetId] = useState(null);
  const [pool, setPool] = useState([]);
  const [index, setIndex] = useState(0);
  const [timer, setTimer] = useState(settings.timer);
  const [showNote, setShowNote] = useState(false);
  const [selected, setSelected] = useState(null);
  const [options, setOptions] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
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
    if (quizPool.length === 0) {
      toast.error('Không đủ từ để luyện tập. Hãy thêm từ vựng mới hoặc reset mastery level.');
      return;
    }
    setPool(quizPool);
    setActiveSetId(setId);
    setIndex(0);
    setCorrectAnswers(0);
    setShowNote(false);
    setSelected(null);
  };

  useEffect(() => {
    if (pool.length > 0) {
      const current = pool[index];
      const correctOption = current.meaning;
      const otherMeanings = sets.flatMap(s => s.items).filter(item => item.id !== current.id).map(item => item.meaning);
      const shuffledOthers = otherMeanings.sort(() => 0.5 - Math.random()).slice(0, 3);
      const newOptions = [...shuffledOthers, correctOption].sort(() => 0.5 - Math.random());
      setOptions(newOptions);
      setTimer(settings.timer);
    }
  }, [pool, index, settings.timer, sets]);

  useEffect(() => {
    if (pool.length > 0 && timer > 0 && selected === null) {
      const timerId = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(timerId);
    } else if (timer === 0) {
      setSelected('timeout');
      setShowNote(true);
    }
  }, [timer, pool, selected]);

  const checkAnswer = async (option) => {
    if (selected !== null) return;
    const isCorrect = option === pool[index].meaning;
    setSelected(option);
    setShowNote(true);
    if (isCorrect) {
      setCorrectAnswers(c => c + 1);
      toast.success('Chính xác!');
      const current = pool[index];
      const userDocRef = doc(db, 'vocabData', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const updatedSets = userData.sets.map(s => {
          if (s.id === activeSetId) {
            s.items = s.items.map(item =>
              item.id === current.id ? { ...item, masteryLevel: (item.masteryLevel || 0) + 1, lastReviewedAt: Date.now() } : item
            );
          }
          return s;
        });
        await updateDoc(userDocRef, { sets: updatedSets });
      }
    } else {
      toast.error('Sai rồi...');
    }
  };

  const nextQuestion = () => {
    if (index < pool.length - 1) {
      setIndex(i => i + 1);
      setSelected(null);
      setShowNote(false);
    } else {
      onFinish(correctAnswers);
    }
  };

  const current = pool[index];

  if (sets.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-gray-500">Vui lòng thêm bộ từ vựng trước khi bắt đầu luyện tập.</p>
      </div>
    );
  }

  if (pool.length === 0) {
    return (
      <div className="p-4 bg-white rounded-xl shadow-md">
        <h3 className="text-lg font-bold mb-3">Chọn bộ từ vựng</h3>
        {sets.map(s => (
          <button
            key={s.id}
            onClick={() => generateQuiz(s.id)}
            className="w-full px-4 py-2 my-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
          >
            {s.name} ({s.items.length})
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-xl shadow-md">
      <div className="text-center mb-4">
        <div className="text-sm text-gray-500">Câu hỏi {index + 1}/{pool.length}</div>
        <div className="text-lg font-bold text-red-500">Thời gian: {timer}s</div>
      </div>
      <div className="text-center">
        <h2 className="text-4xl font-extrabold mb-2">{current.kanji}</h2>
        <p className="text-2xl text-gray-600 mb-4">{current.kana}</p>
        <button onClick={playKana} className="text-xl p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition">
          <FaPlay />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {options.map(o => (
          <button
            key={o}
            onClick={() => checkAnswer(o)}
            className={`p-3 rounded-lg shadow transition ${selected === o ? (o === current.meaning ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'} `}
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
            onBlur={async (e) => {
              if (!user) {
                toast.error('Vui lòng đăng nhập để lưu ghi chú!');
                return;
              }
              const userDocRef = doc(db, 'vocabData', user.uid);
              const docSnap = await getDoc(userDocRef);
              if (docSnap.exists()) {
                const userData = docSnap.data();
                const updatedSets = userData.sets.map(s => {
                  if (s.id === activeSetId) {
                    s.items = s.items.map(it => it.id === current.id ? { ...it, note: e.target.value, updatedAt: Date.now() } : it);
                  }
                  return s;
                });
                await updateDoc(userDocRef, { sets: updatedSets });
                toast.success('Đã lưu ghi chú!');
              }
            }}
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