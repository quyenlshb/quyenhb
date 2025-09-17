import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import VocabManager from './components/VocabManager';
import Quiz from './components/Quiz';
import { sampleSets } from './data/wordSets';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sets, setSets] = useState([]);
  const [settings, setSettings] = useState({ timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true });
  const [pointsToday, setPointsToday] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'vocabData', currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          // New user, save sample data
          await setDoc(userDocRef, {
            sets: sampleSets,
            settings: { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true },
            pointsToday: 0,
            totalPoints: 0,
            streak: 0,
            lastSync: new Date().toISOString()
          });
          toast.info('Đã tạo dữ liệu ban đầu cho bạn!');
        }
        
        // Listen for real-time updates
        const unsubDoc = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setSets(data.sets);
            setSettings(data.settings);
            setPointsToday(data.pointsToday);
            setTotalPoints(data.totalPoints);
            setStreak(data.streak);
          }
        });

        // Cleanup listener when component unmounts
        return () => unsubDoc();

      } else {
        // User logged out, clear states
        setSets([]);
        setSettings({ timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true });
        setPointsToday(0);
        setTotalPoints(0);
        setStreak(0);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleBack = () => {
    setPage('dashboard');
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Đã đăng xuất thành công!');
      // State is cleared in onAuthStateChanged listener
    } catch (e) {
      toast.error('Có lỗi khi đăng xuất: ' + e.message);
    }
  };

  const handleQuizFinish = async (score) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu điểm!');
      setPage('dashboard');
      return;
    }

    const userDocRef = doc(db, 'vocabData', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const newPoints = data.pointsToday + score;
    const newTotalPoints = data.totalPoints + score;
    const newStreak = newPoints >= data.settings.dailyTarget ? (data.streak || 0) + 1 : data.streak;

    await setDoc(userDocRef, {
      ...data,
      pointsToday: newPoints,
      totalPoints: newTotalPoints,
      streak: newStreak
    });
    toast.success(`Đã hoàn thành bài kiểm tra! +${score} điểm.`);
    setPage('dashboard');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const renderContent = () => {
    if (!user) {
      return <AuthForm auth={auth} />;
    }
    switch (page) {
      case 'dashboard':
        return (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Dashboard</h2>
            <p className="text-lg">Điểm hôm nay: <span className="font-bold text-indigo-600">{pointsToday}</span></p>
            <p className="text-lg">Tổng điểm: <span className="font-bold text-indigo-600">{totalPoints}</span></p>
            <p className="text-lg">Streak: <span className="font-bold text-indigo-600">{streak} ngày</span></p>
            <p className="text-lg">Mục tiêu: <span className="font-bold text-indigo-600">{settings.dailyTarget} điểm</span></p>
            <div className="mt-8 space-y-4 max-w-sm mx-auto">
              <button onClick={() => setPage('quiz')} className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition">
                Bắt đầu Luyện tập
              </button>
              <button onClick={() => setPage('vocabManager')} className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition">
                Quản lý Từ vựng
              </button>
            </div>
          </div>
        );
      case 'quiz':
        return <Quiz sets={sets} settings={settings} onFinish={handleQuizFinish} user={user} db={db} />;
      case 'vocabManager':
        return <VocabManager db={db} user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col items-center">
      <Header
        title="Luyện từ vựng"
        onOpenSettings={() => setPage('settings')}
        user={user}
        onLogout={handleLogout}
        showBackButton={page !== 'dashboard'}
        onBack={handleBack}
      />
      <main className="flex-grow container mx-auto p-4 max-w-2xl">
        {renderContent()}
      </main>
    </div>
  );
}import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import AuthForm from './components/AuthForm';
import VocabManager from './components/VocabManager';
import Quiz from './components/Quiz';
import { sampleSets } from './data/wordSets';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sets, setSets] = useState([]);
  const [settings, setSettings] = useState({ timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true });
  const [pointsToday, setPointsToday] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'vocabData', currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (!docSnap.exists()) {
          // New user, save sample data
          await setDoc(userDocRef, {
            sets: sampleSets,
            settings: { timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true },
            pointsToday: 0,
            totalPoints: 0,
            streak: 0,
            lastSync: new Date().toISOString()
          });
          toast.info('Đã tạo dữ liệu ban đầu cho bạn!');
        }
        
        // Listen for real-time updates
        const unsubDoc = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setSets(data.sets);
            setSettings(data.settings);
            setPointsToday(data.pointsToday);
            setTotalPoints(data.totalPoints);
            setStreak(data.streak);
          }
        });

        // Cleanup listener when component unmounts
        return () => unsubDoc();

      } else {
        // User logged out, clear states
        setSets([]);
        setSettings({ timer: 10, perSession: 10, dailyTarget: 30, canSetTarget: true });
        setPointsToday(0);
        setTotalPoints(0);
        setStreak(0);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleBack = () => {
    setPage('dashboard');
    window.scrollTo(0, 0);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Đã đăng xuất thành công!');
      // State is cleared in onAuthStateChanged listener
    } catch (e) {
      toast.error('Có lỗi khi đăng xuất: ' + e.message);
    }
  };

  const handleQuizFinish = async (score) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để lưu điểm!');
      setPage('dashboard');
      return;
    }

    const userDocRef = doc(db, 'vocabData', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) return;

    const data = docSnap.data();
    const newPoints = data.pointsToday + score;
    const newTotalPoints = data.totalPoints + score;
    const newStreak = newPoints >= data.settings.dailyTarget ? (data.streak || 0) + 1 : data.streak;

    await setDoc(userDocRef, {
      ...data,
      pointsToday: newPoints,
      totalPoints: newTotalPoints,
      streak: newStreak
    });
    toast.success(`Đã hoàn thành bài kiểm tra! +${score} điểm.`);
    setPage('dashboard');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const renderContent = () => {
    if (!user) {
      return <AuthForm auth={auth} />;
    }
    switch (page) {
      case 'dashboard':
        return (
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Dashboard</h2>
            <p className="text-lg">Điểm hôm nay: <span className="font-bold text-indigo-600">{pointsToday}</span></p>
            <p className="text-lg">Tổng điểm: <span className="font-bold text-indigo-600">{totalPoints}</span></p>
            <p className="text-lg">Streak: <span className="font-bold text-indigo-600">{streak} ngày</span></p>
            <p className="text-lg">Mục tiêu: <span className="font-bold text-indigo-600">{settings.dailyTarget} điểm</span></p>
            <div className="mt-8 space-y-4 max-w-sm mx-auto">
              <button onClick={() => setPage('quiz')} className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition">
                Bắt đầu Luyện tập
              </button>
              <button onClick={() => setPage('vocabManager')} className="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition">
                Quản lý Từ vựng
              </button>
            </div>
          </div>
        );
      case 'quiz':
        return <Quiz sets={sets} settings={settings} onFinish={handleQuizFinish} user={user} db={db} />;
      case 'vocabManager':
        return <VocabManager db={db} user={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col items-center">
      <Header
        title="Luyện từ vựng"
        onOpenSettings={() => setPage('settings')}
        user={user}
        onLogout={handleLogout}
        showBackButton={page !== 'dashboard'}
        onBack={handleBack}
      />
      <main className="flex-grow container mx-auto p-4 max-w-2xl">
        {renderContent()}
      </main>
    </div>
  );
}