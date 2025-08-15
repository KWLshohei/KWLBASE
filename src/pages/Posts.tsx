import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { firestore } from '../firebase';

interface Post {
  id: string;
  brand: string;
  distillery: string;
  caskType: string;
  abv: string;
  comment: string;
  photoURL: string;
}

// Page listing tasting posts with simple brand/distillery filters
export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [brandFilter, setBrandFilter] = useState('');
  const [distilleryFilter, setDistilleryFilter] = useState('');

  useEffect(() => {
    const q = query(collection(firestore, 'tastings'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })));
    });
    return unsub;
  }, []);

  const filtered = posts.filter(p =>
    p.brand.toLowerCase().includes(brandFilter.toLowerCase()) &&
    p.distillery.toLowerCase().includes(distilleryFilter.toLowerCase())
  );

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">投稿一覧</h1>
      <div className="flex gap-2 mb-4">
        <input className="border p-2" placeholder="ブランド" value={brandFilter} onChange={e => setBrandFilter(e.target.value)} />
        <input className="border p-2" placeholder="蒸留所" value={distilleryFilter} onChange={e => setDistilleryFilter(e.target.value)} />
      </div>
      <div className="space-y-4">
        {filtered.map(p => (
          <div key={p.id} className="border p-4 bg-white">
            {p.photoURL && <img src={p.photoURL} alt={p.brand} className="w-full mb-2" />}
            <div className="font-bold">{p.brand}</div>
            <div>{p.distillery} / {p.caskType} / {p.abv}%</div>
            <p>{p.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
