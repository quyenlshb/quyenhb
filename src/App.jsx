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

export default function App(){
  const handleBack = ()=>{ setPage('dashboard'); window.scrollTo(0,0); };
  const handleHome = ()=>{ setPage('dashboard'); window.scrollTo(0,0); };
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [sets, setSets] = useState(sampleSets);
  const [settings, setSettings] = useState({ timer: 10, perSession: 10, dailyTarget: 30 });
  const [pointsToday, setPointsToday] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastSync, setLastSync] = useState(null);

  // Lắng nghe trạng thái xác thực và đồng bộ dữ liệu
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Lấy dữ liệu người dùng từ Firestore
        const userDocRef = doc(db, `artifacts/${__app_id}/users/${currentUser.uid}/profile/main`);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSets(data.vocabSets || sampleSets);
          setSettings(data.settings || { timer: 10, perSession: 10, dailyTarget: 30 });
          setPointsToday(data.pointsToday || 0);
          setTotalPoints(data.totalPoints || 0);
          setStreak(data.streak || 0);
          setLastSync(data.lastSync || null);
        } else {
          // Tạo dữ liệu mặc định nếu chưa có
          await setDoc(userDocRef, {
            vocabSets: sampleSets,
            settings: { timer: 10, perSession: 10, dailyTarget: 30 },
            pointsToday: 0,
            totalPoints: 0,
            streak: 0,
            lastSync: Date.now()
          });
        }
        
        // Lắng nghe cập nhật dữ liệu real-time
        const unsubscribeSnapshot = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            setSets(data.vocabSets || sampleSets);
            setSettings(data.settings || { timer: 10, perSession: 10, dailyTarget: 30 });
            setPointsToday(data.pointsToday || 0);
            setTotalPoints(data.totalPoints || 0);
            setStreak(data.streak || 0);
            setLastSync(data.lastSync || null);
          }
        });
        
        return () => unsubscribeSnapshot();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const saveSettings = async () => {
    if(settings.dailyTarget < (settings.dailyTarget || 0)) {
      toast.error('Mục tiêu chỉ có thể tăng, không thể giảm');
      return;
    }
    const userDocRef = doc(db, `artifacts/${__app_id}/users/${user.uid}/profile/main`);
    await updateDoc(userDocRef, { settings });
    toast.success('Đã lưu cài đặt!');
  };

  const updatePoints = async (earnedPoints) => {
    const newPoints = pointsToday + earnedPoints;
    const newTotalPoints = totalPoints + earnedPoints;
    setPointsToday(newPoints);
    setTotalPoints(newTotalPoints);
    if(user){
      const userDocRef = doc(db, `artifacts/${__app_id}/users/${user.uid}/profile/main`);
      await updateDoc(userDocRef, { 
        pointsToday: newPoints,
        totalPoints: newTotalPoints
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setPage('dashboard');
    toast.info('Đã đăng xuất!');
  };

  if(loading) return <div className="flex items-center justify-center h-screen text-gray-700">Đang tải...</div>;
  
  const renderPage = () => {
    switch(page){
      case 'dashboard':
        return (
          <div className="container mx-auto p-4 sm:p-8">
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Bảng điều khiển</h2>
            {user ? (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Tiến độ của bạn</h3>
                  <p className="mb-2">Điểm hôm nay: <span className="font-semibold text-indigo-600">{pointsToday} / {settings.dailyTarget}</span></p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${Math.min(100, (pointsToday / settings.dailyTarget) * 100)}%` }}></div>
                  </div>
                  <p className="mb-2">Tổng điểm: <span className="font-semibold text-indigo-600">{totalPoints}</span></p>
                  <p>Chuỗi học tập liên tiếp: <span className="font-semibold text-indigo-600">{streak} ngày</span></p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                  <h3 className="text-xl font-bold mb-4 text-gray-800">Học tập ngay!</h3>
                  <button onClick={() => setPage('quiz')} className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200">
                    Bắt đầu luyện tập
                  </button>
                  <button onClick={() => setPage('vocab')} className="w-full mt-4 px-6 py-3 border border-indigo-600 text-indigo-600 font-semibold rounded-lg shadow-md hover:bg-indigo-50 transition duration-200">
                    Quản lý từ vựng
                  </button>
                </div>
              </div>
            ) : (
              <AuthForm auth={auth} />
            )}
          </div>
        );
      case 'vocab':
        return <VocabManager db={db} user={user} sets={sets} setSets={setSets} />;
      case 'quiz':
        return <Quiz sets={sets} settings={settings} onFinish={() => setPage('dashboard')} onUpdatePoints={updatePoints} />;
      case 'settings':
        return (
          <div className="container mx-auto p-4 sm:p-8">
            <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200">
              <h3 className="text-xl font-bold mb-4 text-gray-800">Cài đặt</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Thời gian mỗi câu (giây)</label>
                  <input
                    type="number"
                    value={settings.timer}
                    onChange={e => setSettings(prev => ({ ...prev, timer: Math.max(1, Number(e.target.value)) }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Số từ mỗi lần</label>
                  <input
                    type="number"
                    value={settings.perSession}
                    onChange={e => setSettings(prev => ({ ...prev, perSession: Math.max(1, Number(e.target.value)) }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mục tiêu điểm hằng ngày</label>
                  <input
                    type="number"
                    value={settings.dailyTarget}
                    onChange={e => setSettings(prev => ({ ...prev, dailyTarget: Math.max(1, Number(e.target.value)) }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                </div>
              </div>
              <button
                onClick={saveSettings}
                className="mt-6 w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-200"
              >
                Lưu cài đặt
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen-minus-header font-sans text-gray-900">
      <Header
        title="Học tiếng Nhật"
        onBack={handleBack}
        onHome={handleHome}
        onOpenSettings={() => setPage('settings')}
        user={user}
        onLogout={logout}
        showBackButton={page !== 'dashboard'}
      />
      {renderPage()}
    </div>
  );
}
