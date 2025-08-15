import { useState } from 'react';
import { firestore, storage, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Form for creating a tasting note with optional photo upload
export default function TastingForm() {
  const [brand, setBrand] = useState('');
  const [distillery, setDistillery] = useState('');
  const [caskType, setCaskType] = useState('');
  const [abv, setAbv] = useState('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let photoURL = '';
    if (photo) {
      const storageRef = ref(storage, `tastings/${Date.now()}_${photo.name}`);
      await uploadBytes(storageRef, photo);
      photoURL = await getDownloadURL(storageRef);
    }
    await addDoc(collection(firestore, 'tastings'), {
      uid: auth.currentUser?.uid,
      brand,
      distillery,
      caskType,
      abv,
      comment,
      photoURL,
      createdAt: serverTimestamp(),
    });
    setBrand('');
    setDistillery('');
    setCaskType('');
    setAbv('');
    setComment('');
    setPhoto(null);
    alert('投稿しました');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 max-w-md mx-auto space-y-2">
      <h1 className="text-xl">テイスティング投稿</h1>
      <input className="border p-2 w-full" placeholder="銘柄" value={brand} onChange={e => setBrand(e.target.value)} />
      <input className="border p-2 w-full" placeholder="蒸留所" value={distillery} onChange={e => setDistillery(e.target.value)} />
      <input className="border p-2 w-full" placeholder="樽種類" value={caskType} onChange={e => setCaskType(e.target.value)} />
      <input className="border p-2 w-full" placeholder="ABV" value={abv} onChange={e => setAbv(e.target.value)} />
      <textarea className="border p-2 w-full" placeholder="コメント" value={comment} onChange={e => setComment(e.target.value)} />
      <input type="file" onChange={e => setPhoto(e.target.files?.[0] || null)} />
      <button type="submit" className="bg-green-500 text-white px-4 py-2">投稿</button>
    </form>
  );
}
