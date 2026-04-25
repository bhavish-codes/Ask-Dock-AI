interface HeaderProps {
  onLogout?: () => void;
  username?: string | null;
}

export default function Header({ onLogout, username }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-2">
        <h1 className="text-xl font-bold text-gray-900">Ask Docks</h1>
        {username && <span className="text-xs text-gray-400 font-medium ml-4">Logged in as {username}</span>}
      </div>

      <div className="flex items-center gap-4">
        <button className="text-gray-500 hover:text-black text-sm font-medium transition-colors">
          Toggle Theme
        </button>
        {onLogout && (
          <button 
            onClick={onLogout}
            className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
