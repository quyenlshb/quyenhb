import React, { useEffect, useState } from 'react';

export default function Quiz({ question, options, correctAnswer, onAnswer, timeLimit }) {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [disabled, setDisabled] = useState(false);

  // Shuffle once whenever question changes
  useEffect(() => {
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    setShuffledOptions(shuffled);
    setTimeLeft(timeLimit);
    setSelectedOption(null);
    setDisabled(false);
  }, [question, options, timeLimit]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!selectedOption) onAnswer(null);
      setDisabled(true);
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

  const getButtonClass = (opt) => {
    if (!selectedOption) return 'bg-white/90 hover:bg-blue-200';
    if (opt === correctAnswer)
      return 'bg-green-400 text-white font-bold animate-pulse';
    if (opt === selectedOption && selectedOption !== correctAnswer)
      return 'bg-red-400 text-white font-bold animate-shake';
    return 'opacity-50 cursor-not-allowed';
  };

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
            className={`w-full p-4 rounded-2xl shadow-md transition text-left text-base font-medium ${getButtonClass(opt)}`}
          >
            {opt}
          </button>
        ))}
      </div>
      {/* Tailwind custom animation */}
      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
          }
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}
      </style>
    </div>
  );
}
