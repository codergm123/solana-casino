import create from "zustand";

const useGameStore = create((set) => ({
  players: [],
  setPlayers: (val) => {
    set({ players: val });
  },
  socket: undefined,
  setSocket: (value) => {
    set({ socket: value });
  },
  myEmail: undefined,
  setMyEmail: (val) => {
    set({ myEmail: val });
  },
}));

export default useGameStore;
