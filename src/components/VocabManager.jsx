import React, { useState, useEffect } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { nanoid } from 'nanoid';
import { FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

export default function VocabManager({ user, db }) {
  const [sets, setSets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [paste, setPaste] = useState('');
  const [editingSet, setEditingSet] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'vocabData', user.uid);
      const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const fetchedSets = docSnap.data().sets || [];
          setSets(fetchedSets);
          if (selected) {
            setSelected(fetchedSets.find(s => s.id === selected.id) || null);
          }
        }
      });
      return () => unsub();
    }
  }, [user, db, selected]);

  const addSet = async () => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thực hiện!');
      return;
    }
    const name = prompt('Tên bộ từ mới');
    if (!name) return;
    const ns = { id: nanoid(), name, items: [], updatedAt: Date.now() };

    const userDocRef = doc(db, 'vocabData', user.uid);
    try {
      await updateDoc(userDocRef, { sets: [...sets, ns] });
      toast.success('Đã thêm bộ từ thành công!');
    } catch (e) {
      console.error('Lỗi khi đồng bộ bộ từ mới:', e);
      toast.error('Đã xảy ra lỗi!');
    }
  };

  const deleteSet = async (setId) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thực hiện!');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa bộ từ này?')) {
      const updatedSets = sets.filter(s => s.id !== setId);
      const userDocRef = doc(db, 'vocabData', user.uid);
      try {
        await updateDoc(userDocRef, { sets: updatedSets });
        setSelected(null);
        toast.success('Đã xóa bộ từ thành công!');
      } catch (e) {
        console.error('Lỗi khi xóa bộ từ:', e);
        toast.error('Đã xảy ra lỗi!');
      }
    }
  };

  const editSet = async (setId) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thực hiện!');
      return;
    }
    const newName = prompt('Nhập tên mới cho bộ từ');
    if (!newName || newName === '') return;
    const updatedSets = sets.map(s => {
      if (s.id === setId) {
        return { ...s, name: newName, updatedAt: Date.now() };
      }
      return s;
    });
    const userDocRef = doc(db, 'vocabData', user.uid);
    try {
      await updateDoc(userDocRef, { sets: updatedSets });
      setSelected(updatedSets.find(s => s.id === setId));
      toast.success('Đã đổi tên bộ từ thành công!');
    } catch (e) {
      console.error('Lỗi khi đổi tên bộ từ:', e);
      toast.error('Đã xảy ra lỗi!');
    }
  };

  const deleteItem = async (itemId) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thực hiện!');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa từ này?')) {
      const updatedSets = sets.map(s => {
        if (s.id === selected.id) {
          s.items = s.items.filter(it => it.id !== itemId);
        }
        return s;
      });
      const userDocRef = doc(db, 'vocabData', user.uid);
      try {
        await updateDoc(userDocRef, { sets: updatedSets });
        setSelected(updatedSets.find(s => s.id === selected.id));
        toast.success('Đã xóa từ thành công!');
      } catch (e) {
        console.error('Lỗi khi xóa từ:', e);
        toast.error('Đã xảy ra lỗi!');
      }
    }
  };

  const saveEditItem = async (originalItem) => {
    if (!user) {
      toast.error('Vui lòng đăng nhập để thực hiện!');
      return;
    }
    const updatedSets = sets.map(s => {
      if (s.id === selected.id) {
        s.items = s.items.map(it => it.id === originalItem.id ? editingItem : it);
      }
      return s;
    });
    const userDocRef = doc(db, 'vocabData', user.uid);
    try {
      await updateDoc(userDocRef, { sets: updatedSets });
      setEditingItem(null);
      setSelected(updatedSets.find(s => s.id === selected.id));
      toast.success('Đã cập nhật từ thành công!');
    } catch (e) {
      console.error('Lỗi khi cập nhật từ:', e);
      toast.error('Đã xảy ra lỗi!');
    }
  };

  const importPaste = async () => {
    if (!selected || !user) {
      toast.error('Vui lòng chọn bộ từ và đăng nhập trước khi import.');
      return;
    }
    const lines = paste.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const items = [];
    lines.forEach(line => {
      const parts = line.split(/\s+/);
      if (parts.length >= 3) {
        items.push({
          id: nanoid(),
          kanji: parts[0],
          kana: parts[1],
          meaning: parts[2],
          note: '',
          masteryLevel: 0,
          lastReviewedAt: null
        });
      }
    });

    if (items.length === 0) {
      toast.error('Không tìm thấy từ vựng nào hợp lệ để import.');
      return;
    }

    const updatedSets = sets.map(s => {
      if (s.id === selected.id) {
        return { ...s, items: [...s.items, ...items], updatedAt: Date.now() };
      }
      return s;
    });

    const userDocRef = doc(db, 'vocabData', user.uid);
    try {
      await updateDoc(userDocRef, { sets: updatedSets });
      setPaste('');
      setSelected({ ...selected, items: [...selected.items, ...items] });
      toast.success(`Đã thêm ${items.length} từ vựng mới vào bộ từ.`);
    } catch