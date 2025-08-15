import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

// Simple login page offering Google OAuth and email/password auth
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isNew, setIsNew] = useState(false);

  // Handle email based sign-in or sign-up
  const handleEmailAuth = async () => {
    if (isNew) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  };

  // Popup Google login
  const handleGoogle = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl mb-4">ログイン</h1>
      <div className="mb-4">
        <input className="border p-2 w-full mb-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="border p-2 w-full mb-2" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={handleEmailAuth} className="bg-blue-500 text-white px-4 py-2 w-full">{isNew ? '登録' : 'ログイン'}</button>
        <button onClick={() => setIsNew(!isNew)} className="text-sm text-blue-500 mt-1 w-full">{isNew ? '既にアカウントを持っています' : '新規登録はこちら'}</button>
      </div>
      <button onClick={handleGoogle} className="border px-4 py-2 w-full">Googleでログイン</button>
    </div>
  );
}
