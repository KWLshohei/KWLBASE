import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut, User } from 'firebase/auth';

interface Props {
  user: User | null;
}

// Simple navigation bar used across pages
export default function Navbar({ user }: Props) {
  return (
    <nav className="p-4 bg-white shadow flex gap-4">
      <Link to="/posts" className="font-bold">KWL</Link>
      {user && (
        <>
          <Link to="/tasting">テイスティング投稿</Link>
          <Link to="/events">イベント</Link>
          <button onClick={() => signOut(auth)} className="ml-auto text-sm text-red-500">ログアウト</button>
        </>
      )}
    </nav>
  );
}
