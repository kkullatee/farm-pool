import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { demoHarvests, demoOrder } from '@/data/demo';
import { newId } from '@/lib/ids';
import { buildMatchPlan } from '@/lib/matching';
import { BuyerOrder, ChatMessage, Harvest, MatchPlan } from '@/lib/types';

type StoredState = {
  customHarvests: Harvest[];
  order: BuyerOrder | null;
  dealApproved: boolean;
  chosenCombinationId?: string | null;
  chats?: Record<string, ChatMessage[]>;
};

type ContextValue = {
  harvests: Harvest[];
  lastHarvest: Harvest | null;
  order: BuyerOrder | null;
  plan: MatchPlan | null;
  dealApproved: boolean;
  hydrated: boolean;
  chats: Record<string, ChatMessage[]>;
  registerHarvest: (harvest: Omit<Harvest, 'id'>) => Harvest;
  createOrderAndMatch: (order: BuyerOrder) => MatchPlan;
  chooseCombination: (combinationId: string) => void;
  sendChatMessage: (harvestId: string, text: string) => void;
  runDemo: () => MatchPlan;
  approveDeal: () => void;
  resetDemo: () => void;
};

// v4: simple condition grade replaced detailed measurements; added seller chat.
const STORAGE_KEY = 'farmpool-state-v4';
const FarmPoolContext = createContext<ContextValue | null>(null);

export function FarmPoolProvider({ children }: PropsWithChildren) {
  const [customHarvests, setCustomHarvests] = useState<Harvest[]>([]);
  const [lastHarvest, setLastHarvest] = useState<Harvest | null>(null);
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [plan, setPlan] = useState<MatchPlan | null>(null);
  const [chosenCombinationId, setChosenCombinationId] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [dealApproved, setDealApproved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const harvests = useMemo(() => [...demoHarvests, ...customHarvests], [customHarvests]);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw) as StoredState;
          setCustomHarvests(stored.customHarvests ?? []);
          setOrder(stored.order ?? null);
          setDealApproved(Boolean(stored.dealApproved));
          setChosenCombinationId(stored.chosenCombinationId ?? null);
          setChats(stored.chats ?? {});
          if (stored.order) {
            setPlan(
              buildMatchPlan(
                stored.order,
                [...demoHarvests, ...(stored.customHarvests ?? [])],
                stored.chosenCombinationId,
              ),
            );
          }
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const stored: StoredState = { customHarvests, order, dealApproved, chosenCombinationId, chats };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [customHarvests, order, dealApproved, chosenCombinationId, chats, hydrated]);

  function registerHarvest(input: Omit<Harvest, 'id'>) {
    const harvest: Harvest = {
      ...input,
      id: `harvest-${Date.now()}`,
    };
    setCustomHarvests((current) => [...current, harvest]);
    setLastHarvest(harvest);
    return harvest;
  }

  function createOrderAndMatch(nextOrder: BuyerOrder) {
    const nextPlan = buildMatchPlan(nextOrder, harvests);
    setOrder(nextOrder);
    setPlan(nextPlan);
    setChosenCombinationId(null);
    setDealApproved(false);
    return nextPlan;
  }

  function sendChatMessage(harvestId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const message: ChatMessage = {
      id: newId('msg'),
      harvestId,
      sender: 'buyer',
      text: trimmed,
      sentAt: new Date().toISOString(),
    };
    setChats((current) => ({
      ...current,
      [harvestId]: [...(current[harvestId] ?? []), message],
    }));
  }

  function chooseCombination(combinationId: string) {
    if (!order) return;
    setChosenCombinationId(combinationId);
    setPlan(buildMatchPlan(order, harvests, combinationId));
    setDealApproved(false);
  }

  function runDemo() {
    return createOrderAndMatch({ ...demoOrder, id: `demo-order-${Date.now()}` });
  }

  function approveDeal() {
    setDealApproved(true);
  }

  function resetDemo() {
    setCustomHarvests([]);
    setLastHarvest(null);
    setOrder(null);
    setPlan(null);
    setChosenCombinationId(null);
    setChats({});
    setDealApproved(false);
    void AsyncStorage.removeItem(STORAGE_KEY);
  }

  return (
    <FarmPoolContext.Provider
      value={{
        harvests,
        lastHarvest,
        order,
        plan,
        dealApproved,
        hydrated,
        chats,
        registerHarvest,
        createOrderAndMatch,
        chooseCombination,
        sendChatMessage,
        runDemo,
        approveDeal,
        resetDemo,
      }}>
      {children}
    </FarmPoolContext.Provider>
  );
}

export function useFarmPool() {
  const context = useContext(FarmPoolContext);
  if (!context) throw new Error('useFarmPool must be used inside FarmPoolProvider');
  return context;
}

