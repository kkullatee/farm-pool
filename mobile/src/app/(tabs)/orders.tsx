import { BuyerOrders } from '@/components/BuyerOrders';
import { SellerOrders } from '@/components/SellerOrders';
import { useFarmPool } from '@/context/FarmPoolContext';

export default function OrdersScreen() {
  const { role } = useFarmPool();
  return role === 'buyer' ? <BuyerOrders /> : <SellerOrders />;
}
