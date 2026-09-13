import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { demoHarvests, demoOrder } from '@/data/demo';
import { newId } from '@/lib/ids';
import { buildMatchPlan } from '@/lib/matching';
import {
  BuyerOrder,
  ChatMessage,
  DemoRole,
  Harvest,
  MatchPlan,
  OrderRequest,
  SellerResponse,
} from '@/lib/types';

type StoredState = {
  customHarvests: Harvest[];
  order: BuyerOrder | null;
  dealApproved: boolean;
  chosenCombinationId?: string | null;
  chats?: Record<string, ChatMessage[]>;
  role?: DemoRole;
  orderRequests?: OrderRequest[];
};

type ContextValue = {
  harvests: Harvest[];
  lastHarvest: Harvest | null;
  order: BuyerOrder | null;
  plan: MatchPlan | null;
  dealApproved: boolean;
  hydrated: boolean;
  chats: Record<string, ChatMessage[]>;
  role: DemoRole;
  orderRequests: OrderRequest[];
  setRole: (role: DemoRole) => void;
  respondToRequest: (requestId: string, status: Exclude<SellerResponse, 'Pending'>) => void;
  registerHarvest: (harvest: Omit<Harvest, 'id'>) => Harvest;
  createOrderAndMatch: (order: BuyerOrder) => MatchPlan;
  chooseCombination: (combinationId: string) => void;
  sendChatMessage: (harvestId: string, text: string) => void;
  runDemo: () => MatchPlan;
  approveDeal: () => void;
  resetDemo: () => void;
};

// v5: demo role switch and per-seller order requests.
const STORAGE_KEY = 'farmpool-state-v5';
const FarmPoolContext = createContext<ContextValue | null>(null);

export function FarmPoolProvider({ children }: PropsWithChildren) {
  const [customHarvests, setCustomHarvests] = useState<Harvest[]>([]);
  const [lastHarvest, setLastHarvest] = useState<Harvest | null>(null);
  const [order, setOrder] = useState<BuyerOrder | null>(null);
  const [plan, setPlan] = useState<MatchPlan | null>(null);
  const [chosenCombinationId, setChosenCombinationId] = useState<string | null>(null);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({});
  const [role, setRole] = useState<DemoRole>('buyer');
  const [orderRequests, setOrderRequests] = useState<OrderRequest[]>([]);
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
          setRole(stored.role ?? 'buyer');
          setOrderRequests(stored.orderRequests ?? []);
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
    const stored: StoredState = {
      customHarvests,
      order,
      dealApproved,
      chosenCombinationId,
      chats,
      role,
      orderRequests,
    };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [customHarvests, order, dealApproved, chosenCombinationId, chats, role, orderRequests, hydrated]);

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
    setOrderRequests([]);
    return nextPlan;
  }

  function sendChatMessage(harvestId: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const message: ChatMessage = {
      id: newId('msg'),
      harvestId,
      sender: role,
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
    // Fan out one request per selected farm. Replaces any earlier requests for
    // this order so re-approving after choosing a different pool stays clean.
    if (!plan || !order) return;
    const fresh: OrderRequest[] = plan.selected.map((lot) => ({
      id: newId('req'),
      orderId: order.id,
      harvestId: lot.harvest.id,
      farmerName: lot.harvest.farmerName,
      buyerName: order.businessName,
      crop: order.crop,
      variety: lot.harvest.variety,
      allocatedKg: lot.allocatedKg,
      pricePerKg: lot.harvest.minimumPricePerKg,
      deliveryDate: order.deliveryDate,
      deliveryLocation: order.deliveryLocation,
      status: 'Pending',
    }));
    setOrderRequests((current) => [
      ...current.filter((request) => request.orderId !== order.id),
      ...fresh,
    ]);
  }

  function respondToRequest(requestId: string, status: Exclude<SellerResponse, 'Pending'>) {
    setOrderRequests((current) =>
      current.map((request) => (request.id === requestId ? { ...request, status } : request)),
    );
  }

  function resetDemo() {
    setCustomHarvests([]);
    setLastHarvest(null);
    setOrder(null);
    setPlan(null);
    setChosenCombinationId(null);
    setChats({});
    setOrderRequests([]);
    setRole('buyer');
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
        role,
        orderRequests,
        setRole,
        respondToRequest,
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

