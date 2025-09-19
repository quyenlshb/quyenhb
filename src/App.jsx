import React, { useState, useEffect } from 'react';
import Quiz from './components/Quiz.jsx';

function App() {
  const [sets, setSets] = useState([]);
  const [activeSetId, setActiveSetId] = useState(null);
  const [pool, setPool] = useState([]);
  const [inQuiz, setInQuiz] = useState(false);
  const [points, setPoints] = useState(0);

  // Load sets từ localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('sets')) || [];
    setSets(stored);
    if (stored.length > 0) {
      setActiveSetId(stored[0].id);
    }
  }, []);

  const startQuiz = () => {
    const setObj = sets.find(s => s.id === activeSetId);
    if (!setObj) return;
    setPool(setObj.items);
    setInQuiz(true);
  };

  const finishQuiz = () => {
    setInQuiz(false);
    setPool([]);
  };

  const updateWordItem = (setId, wordId, data) => {
    setSets(prevSets =>
      prevSets.map(s =>
        s.id === setId
          ? {
              ...s,
              items: s.items.map(item =>
                item.id === wordId ? { ...item, ...data } : item
              ),
            }
          : s
      )
    );
    localStorage.setItem('sets', JSON.stringify(sets));
  };

  const handleUpdatePoints = (val) => {
    setPoints(prev => prev + val);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-indigo-600 text-white text-center font-bold text-xl shadow">
        Ứng dụng Học Từ Vựng
      </header>

      <main className="p-4">
        {!inQuiz ? (
          <div className="text-center">
            <h2 className="text-lg mb-4">Chọn bộ từ để học</h2>
            <select
              value={activeSetId || ''}
              onChange={(e) => setActiveSetId(e.target.value)}
              className="p-2 border rounded-lg mb-4"
            >
              {sets.map(set => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
            <br />
            <button
              onClick={startQuiz}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
            >
              Bắt đầu Quiz
            </button>
          </div>
        ) : (
          <Quiz
            pool={pool}
            activeSetId={activeSetId}
            settings={{}}
            onFinish={finishQuiz}
            onUpdatePoints={handleUpdatePoints}
            user={null}
            db={null}
            updateWordItem={updateWordItem}
            sets={sets}
          />
        )}
      </main>
    </div>
  );
}

export default App;
