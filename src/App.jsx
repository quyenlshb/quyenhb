import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import VocabManager from './components/VocabManager';
import Quiz from './components/Quiz';
import SettingsPanel from './components/SettingsPanel';
import { sampleSets } from './data/wordSets';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { FaPlay, FaBook, FaCog } from 'react-icons/fa';

export default function App(){
  const handleBack = ()=>{ setPage('dashboard'); window.scrollTo(0,0); };
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sets, setSets] = useState([]);
  const [settings, setSettings] = useState({ timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true });
  const [pointsToday, setPointsToday] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'vocabData', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setSets(data.sets || []);
            setSettings(data.settings || { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true });
            setPointsToday(data.pointsToday || 0);
            setTotalPoints(data.totalPoints || 0);
            setStreak(data.streak || 0);
          } else {
            await setDoc(userDocRef, {
              sets: sampleSets,
              settings: settings,
              pointsToday: 0,
              totalPoints: 0,
              streak: 0,
            });
            setSets(sampleSets);
            toast.success("Đã tạo dữ liệu người dùng mới!");
          }
        } catch (e) {
          console.error("Lỗi khi tải dữ liệu:", e);
          toast.error("Không thể tải dữ liệu. Vui lòng thử lại sau.");
        }
      } else {
        setSets(sampleSets);
        setSettings({ timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true });
        setPointsToday(0);
        setTotalPoints(0);
        setStreak(0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleQuizFinish = async (newPoints) => {
    if (user) {
      const newPointsToday = pointsToday + newPoints;
      const newTotalPoints = totalPoints + newPoints;
      
      const today = new Date().toDateString();
      const lastSessionDate = new Date().toDateString(); // Lấy ngày của lần luyện tập gần nhất

      let newStreak = streak;
      if (newPointsToday >= settings.dailyTarget) {
        // Cần kiểm tra xem có phải ngày mới không để cộng streak
        const userDocRef = doc(db, 'vocabData', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const lastStreakDate = data.lastStreakDate;
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastStreakDate !== today) {
                if (lastStreakDate === yesterday.toDateString()) {
                    newStreak = streak + 1;
                } else {
                    newStreak = 1;
                }
            } else {
                newStreak = streak;
            }
        } else {
            newStreak = 1; // Khởi tạo streak
        }
      }
      
      const userDocRef = doc(db, 'vocabData', user.uid);
      try {
        await updateDoc(userDocRef, {
          pointsToday: newPointsToday,
          totalPoints: newTotalPoints,
          streak: newStreak,
          lastSessionDate: lastSessionDate
        });
        setPointsToday(newPointsToday);
        setTotalPoints(newTotalPoints);
        setStreak(newStreak);
        toast.success(`Hoàn thành! Bạn đã kiếm được ${newPoints} điểm.`);
      } catch (e) {
        console.error("Lỗi khi cập nhật điểm:", e);
        toast.error("Không thể lưu tiến độ.");
      }
    } else {
      setPointsToday(pointsToday + newPoints);
      setTotalPoints(totalPoints + newPoints);
      toast.success(`Hoàn thành! Bạn đã kiếm được ${newPoints} điểm.`);
    }
    setPage('dashboard');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info("Đã đăng xuất!");
    } catch (e) {
      console.error("Lỗi khi đăng xuất:", e);
      toast.error("Đăng xuất thất bại!");
    }
  };

  const renderPage = () => {
    if (!user) {
      return <AuthForm auth={auth} />;
    }
    
    switch (page) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md text-center">
              <h3 className="text-xl font-bold mb-2">Tiến độ của bạn</h3>
              <div className="flex justify-around items-center space-x-4">
                <div className="text-center">
                  <span className="block text-2xl font-bold text-green-500">{totalPoints}</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tổng điểm</span>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-yellow-500">🔥 {streak}</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Streak</span>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold text-blue-500">{pointsToday} / {settings.dailyTarget}</span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Hôm nay</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button onClick={() => setPage('quiz')} className="flex flex-col items-center justify-center p-6 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition">
                <FaPlay className="text-4xl mb-2" />
                <span className="text-lg">Luyện tập</span>
              </button>
              <button onClick={() => setPage('vocabManager')} className="flex flex-col items-center justify-center p-6 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition">
                <FaBook className="text-4xl mb-2" />
                <span className="text-lg">Quản lý Từ vựng</span>
              </button>
              <button onClick={() => setPage('settings')} className="flex flex-col items-center justify-center p-6 bg-gray-600 text-white font-bold rounded-lg shadow-lg hover:bg-gray-700 transition col-span-1 md:col-span-2">
                <FaCog className="text-4xl mb-2" />
                <span className="text-lg">Cài đặt</span>
              </button>
            </div>
          </div>
        );
      case 'quiz':
        return <Quiz sets={sets} settings={settings} onFinish={handleQuizFinish} user={user} db={db} />;
      case 'vocabManager':
        return <VocabManager sets={sets} setSets={setSets} db={db} user={user} />;
      case 'settings':
        return <SettingsPanel settings={settings} setSettings={setSettings} db={db} user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
      <Header 
        title="Luyện từ vựng" 
        user={user} 
        onLogout={handleLogout} 
        showBackButton={page !== 'dashboard' && page !== 'auth'} 
        onBack={handleBack}
      />
      <main className="flex-grow container mx-auto p-4 max-w-2xl">
        {loading ? (
          <div className="text-center text-lg mt-10">Đang tải...</div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  );
}