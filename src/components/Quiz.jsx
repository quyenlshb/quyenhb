import React, { useEffect, useState } from 'react';

export default function Quiz({ question, options, onAnswer, timeLimit }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [shuffledOptions, setShuffledOptions] = useState([]);

  // Shuffle once whenever question changes
  useEffect(() => {
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    setShuffledOptions(shuffled);
    setTimeLeft(timeLimit); // reset timer for new question
  }, [question, options, timeLimit]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      onAnswer(null); // treat as wrong if timeout
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, onAnswer]);

  const timerColor = timeLeft <= 5 ? 'text-red-600 animate-pulse' : 'text-green-700';

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 shadow-inner">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{question}</h2>
        <div className={`text-2xl font-bold ${timerColor}`}>{timeLeft}s</div>
      </div>
      <div className="space-y-3">
        {shuffledOptions.map((opt) => (
          <button
            key={opt} // dùng option làm key tránh nhảy UI
            onClick={() => onAnswer(opt)}
            className="w-full p-4 rounded-2xl bg-white/90 shadow-md hover:bg-blue-200 transition text-left text-base font-medium"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
