import React, { useState } from 'react';

export const GoogleLoginButton = () => {
  const [notice, setNotice] = useState('');

  return (
    <div className="w-full">
      <button
        onClick={() => setNotice('Google authentication will be connected during backend integration.')}
        type="button"
        className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 text-xs flex items-center justify-center gap-2 transition-colors"
      >
        <span className="text-sm font-black text-rose-500">G</span> Continue with Google
      </button>
      {notice && (
        <p className="text-[11px] text-sky-600 dark:text-sky-400 text-center mt-2 font-medium">
          {notice}
        </p>
      )}
    </div>
  );
};