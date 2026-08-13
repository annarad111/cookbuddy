import { create } from 'zustand';

export type Receipe = {
    id: string,
    title: string,
}

type ReceipeState = {
    receipes: Receipe[],
    addReceipe: (receipe : Receipe) => void,
}

export const useReceipeStore = create<ReceipeState>((set) => ({
    receipes: [],
    addReceipe: (receipe) => set((state) => ({receipes: [...state.receipes , receipe]}))
}))