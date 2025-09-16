import React, { useEffect, useState } from 'react';

export default function Quiz({ question, options, onAnswer, timeLimit }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null); // track selected answer
  const [disabled, setDisabled] = useState(false); // disable buttons after select

  // Shuffle once whenever question changes
  useEffect(() => {
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    setShuffledOptions(shuffled);
    setTimeLeft(timeLimit);
    setSelectedOption(null); // reset selected answer
    setDisabled(false);      // enable buttons for new question
  }, [question, options, timeLimit]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!selectedOption) onAnswer(null); // treat as wrong if timeout
      setDisabled(true); // disable buttons when time is up
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, onAnswer, selectedOption]);

  const handleAnswer = (opt) => {
    if (disabled) return;
    setSelectedOption(opt);
    setDisabled(true);
    onAnswer(opt);
  };

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
            key={opt}
            onClick={() => handleAnswer(opt)}
            disabled={disabled}
            className={`w-full p-4 rounded-2xl bg-white/90 shadow-md hover:bg-blue-200 transition text-left text-base font-medium
              ${selectedOption === opt ? 'bg-blue-300 font-bold' : ''} 
              ${disabled && selectedOption !== opt ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
