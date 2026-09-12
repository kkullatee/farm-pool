import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { demoHarvests, demoOrder } from '@/data/demo';
import { buildMatchPlan } from '@/lib/matching';
import { BuyerOrder, Harvest, MatchPlan } from '@/lib/types';

type StoredState = {
  customHarvests: Harvest[];
  order: BuyerOrder | null;
  dealApproved: boolean;
};

type ContextValue = {
  harvests: Harvest[];
  lastHarvest: Harvest | null;
  order: BuyerOrder | null;
  plan: MatchPlan | null;
  dealApproved: boolean;
  hydrated: boolean;
  registerHarvest: (harvest: Omit<Harvest, 'id'>) => Harvest;
  createOrderAndMatch: (order: BuyerOrder) => MatchPlan;
  runDemo: () => MatchPlan;
  approveDeal: () => void;
  resetDemo: () => void;
};

const STORAGE_KEY = 'farmpool-state-v1';
const FarmPoolContext = createContext<ContextValue | null>(null);

export function FarmPoolProvider({ children }: PropsWithChildren) {
  const [customHarvests, setCustomHarvests] = useState<Harvest[]>([]);
  const [lastHarvest, setLastHarvest] = useState<Harvest | null>(null);
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [plan, setPlan] = useState<MatchPlan | null>(null);
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
          if (stored.order) {
            setPlan(buildMatchPlan(stored.order, [...demoHarvests, ...(stored.customHarvests ?? [])]));
          }
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const stored: StoredState = { customHarvests, order, dealApproved };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [customHarvests, order, dealApproved, hydrated]);

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
    setDealApproved(false);
    return nextPlan;
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
        registerHarvest,
        createOrderAndMatch,
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

