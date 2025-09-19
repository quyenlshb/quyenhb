import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import AuthForm from './components/AuthForm.jsx';
import VocabManager from './components/VocabManager.jsx';
import Quiz from './components/Quiz.jsx';
import { loadLocal, saveLocal, getLocalMeta } from './utils/storage';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { FaBookOpen, FaUserCog, FaQuestionCircle } from 'react-icons/fa';

export default function App() {
  const [user, setUser] = useState(null);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [activeSetId, setActiveSetId] = useState(localStorage.getItem('activeSet') || null);
  const [pool, setPool] = useState([]);
  const [activeWordSet, setActiveWordSet] = useState(null);

  // Lắng nghe trạng thái xác thực
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadUserData(currentUser.uid);
      } else {
        // Tải dữ liệu từ local storage nếu chưa đăng nhập
        const localSets = loadLocal('vocabSets', []);
        setSets(localSets);
        if (localSets.length > 0 && !activeSetId) {
          setActiveSetId(localSets[0].id);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [activeSetId]);

  // Tải dữ liệu từ Firestore hoặc localStorage
  const loadUserData = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);

      const localMeta = getLocalMeta('vocabSets');
      const localUpdatedAt = localMeta ? localMeta.updatedAt : 0;
      const firestoreUpdatedAt = docSnap.exists() ? docSnap.data().updatedAt || 0 : 0;

      if (docSnap.exists() && firestoreUpdatedAt > localUpdatedAt) {
        // Lấy dữ liệu từ Firestore nếu mới hơn
        const firestoreSets = docSnap.data().sets || [];
        setSets(firestoreSets);
        saveLocal('vocabSets', firestoreSets);
        toast.info("Dữ liệu đã được đồng bộ từ Cloud.");
      } else {
        // Tải dữ liệu từ local và đồng bộ lên Firestore nếu local mới hơn
        const localSets = loadLocal('vocabSets', []);
        setSets(localSets);
        if (localSets.length > 0) {
          await setDoc(docRef, { sets: localSets, updatedAt: Date.now() }, { merge: true });
          toast.info("Dữ liệu đã được đồng bộ lên Cloud.");
        }
      }
      
      const lastActiveSet = localStorage.getItem('activeSet');
      if (lastActiveSet) {
        setActiveSetId(lastActiveSet);
      } else if (sets.length > 0) {
        setActiveSetId(sets[0].id);
      }
    } catch (e) {
      console.error("Lỗi khi tải dữ liệu người dùng: ", e);
      toast.error("Lỗi khi tải dữ liệu, vui lòng thử lại.");
    }
  };

  // Cập nhật và đồng bộ sets
  const handleUpdateSets = (updatedSets) => {
    setSets(updatedSets);
    saveLocal('vocabSets', updatedSets);
    if (user) {
      const docRef = doc(db, 'users', user.uid);
      setDoc(docRef, { sets: updatedSets, updatedAt: Date.now() }, { merge: true });
    }
  };

  // Logic quiz
  const startQuiz = () => {
    if (!activeSetId) {
      toast.error("Vui lòng chọn một bộ từ để bắt đầu.");
      return;
    }
    const setObj = sets.find(s => s.id === activeSetId);
    if (!setObj || setObj.items.length === 0) {
      toast.error("Bộ từ này không có từ nào để kiểm tra.");
      return;
    }

    const sortedItems = [...setObj.items].sort((a, b) => (a.points || 100) - (b.points || 100));
    setPool(sortedItems);
    setActiveWordSet(setObj);
    setCurrentPage('quiz');
  };

  const finishQuiz = () => {
    setCurrentPage('home');
    setPool([]);
    setActiveWordSet(null);
  };

  const updateWordItem = (setId, wordId, data) => {
    const updatedSets = sets.map(s =>
      s.id === setId
        ? {
            ...s,
            items: s.items.map(item =>
              item.id === wordId ? { ...item, ...data } : item
            ),
          }
        : s
    );
    handleUpdateSets(updatedSets);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setSets(loadLocal('vocabSets', []));
      setCurrentPage('home');
      toast.success("Đã đăng xuất!");
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi đăng xuất.");
    }
  };

  // Hiển thị nội dung dựa trên trạng thái
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <p className="text-gray-600 dark:text-gray-400">Đang tải...</p>
        </div>
      );
    }

    if (!user) {
      return <AuthForm auth={auth} />;
    }

    switch (currentPage) {
      case 'home':
        return (
          <div className="p-4 md:p-8 min-h-screen-minus-header bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 text-center">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Chọn chế độ</h2>
              <div className="space-y-4">
                <button
                  onClick={startQuiz}
                  className="w-full flex items-center justify-center p-4 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700 transition"
                >
                  <FaQuestionCircle className="mr-2" /> Bắt đầu Quiz
                </button>
                <button
                  onClick={() => setCurrentPage('manager')}
                  className="w-full flex items-center justify-center p-4 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition"
                >
                  <FaBookOpen className="mr-2" /> Quản lý từ vựng
                </button>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Bộ từ đang chọn:</h3>
                <select
                  value={activeSetId || ''}
                  onChange={(e) => {
                    setActiveSetId(e.target.value);
                    localStorage.setItem('activeSet', e.target.value);
                  }}
                  className="w-full p-2 border rounded-lg mt-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {sets.map(set => (
                    <option key={set.id} value={set.id}>
                      {set.name} ({set.items.length} từ)
                    </option>
                  ))}
                  {sets.length === 0 && (
                    <option value="" disabled>Chưa có bộ từ nào</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        );
      case 'quiz':
        return (
          <Quiz
            pool={pool}
            activeSetId={activeSetId}
            onFinish={finishQuiz}
            updateWordItem={updateWordItem}
            sets={sets}
            user={user}
            db={db}
          />
        );
      case 'manager':
        return (
          <VocabManager
            sets={sets}
            setSets={handleUpdateSets}
            user={user}
            db={db}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <Header
        title="Lingo Master"
        user={user}
        onLogout={handleLogout}
        onHome={() => setCurrentPage('home')}
        onBack={() => {
          if (currentPage === 'quiz') finishQuiz();
          else setCurrentPage('home');
        }}
        showBackButton={currentPage !== 'home' && currentPage !== 'auth'}
        showHomeButton={currentPage !== 'home' && currentPage !== 'auth'}
      />
      <main>
        {renderContent()}
      </main>
    </div>
  );
}