import PokerTable from '../components/PokerTable';

export const metadata = {
  title: 'Poker Lk Hub',
  description: 'Learn and play poker in Sri Lanka',
};

export default function Home() {
  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* 3D Background */}
      <PokerTable />

      {/* 2D HUD Overlay */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center text-white z-10 pointer-events-none">
        <h1 className="text-2xl font-bold tracking-widest drop-shadow-md">POKER LK HUB</h1>
        <div className="bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm pointer-events-auto">
          Balance: 5,000 LKR
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute bottom-10 w-full flex justify-center gap-4 z-10 pointer-events-none">
        <button className="pointer-events-auto bg-red-600 hover:bg-red-700 px-8 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105">
          FOLD
        </button>
        <button className="pointer-events-auto bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105">
          CALL
        </button>
        <button className="pointer-events-auto bg-green-600 hover:bg-green-700 px-8 py-3 rounded-full font-bold shadow-lg transition-transform hover:scale-105">
          RAISE
        </button>
      </div>
    </main>
  );
}