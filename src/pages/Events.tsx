import { useEffect, useState } from 'react';
import { collection, query, orderBy, addDoc, onSnapshot, updateDoc, doc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../firebase';

interface Event {
  id: string;
  title: string;
  date: string;
  detail: string;
  participants?: string[];
}

// Event list page with creation form and join button
export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    const q = query(collection(firestore, 'events'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, snapshot => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });
    return unsub;
  }, []);

  // Create a new event document
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(firestore, 'events'), {
      title,
      date,
      detail,
      participants: [],
      createdAt: serverTimestamp(),
    });
    setTitle('');
    setDate('');
    setDetail('');
  };

  // Register current user to event
  const handleJoin = async (id: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await updateDoc(doc(firestore, 'events', id), {
      participants: arrayUnion(uid),
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">イベント</h1>
      <form onSubmit={handleCreate} className="space-y-2 max-w-md mb-6">
        <input className="border p-2 w-full" placeholder="タイトル" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="border p-2 w-full" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <textarea className="border p-2 w-full" placeholder="詳細" value={detail} onChange={e => setDetail(e.target.value)} />
        <button type="submit" className="bg-green-500 text-white px-4 py-2">登録</button>
      </form>
      <div className="space-y-4">
        {events.map(ev => (
          <div key={ev.id} className="border p-4 bg-white">
            <div className="font-bold">{ev.title}</div>
            <div>{ev.date}</div>
            <p className="mb-2">{ev.detail}</p>
            <button onClick={() => handleJoin(ev.id)} className="bg-blue-500 text-white px-2 py-1">参加</button>
            <div className="text-sm mt-1">参加者: {ev.participants?.length || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
