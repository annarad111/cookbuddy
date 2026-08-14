import { create } from 'zustand';

export type Ingredient={
    id: string,
    name: string,
    amount: string
}

export type Receipe = {
    id: string,
    title: string,
    image?: string,
    servings: number,
    ingredients: Ingredient[],
    steps: string,
}

type ReceipeState = {
    receipes: Receipe[],
    addReceipe: (receipe : Receipe) => void,
}

export const useReceipeStore = create<ReceipeState>((set) => ({
    receipes: [],
    addReceipe: (receipe) => set((state) => ({receipes: [...state.receipes , receipe]}))
}))