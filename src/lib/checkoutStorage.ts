export type CheckoutItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

const CHECKOUT_KEY = "checkout_items";

export function saveCheckoutItems(items: CheckoutItem[]): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(items));
  }
}

export function getCheckoutItems(): CheckoutItem[] | null {
  if (typeof window !== 'undefined') {
    const data = sessionStorage.getItem(CHECKOUT_KEY);
    if (data) {
      try {
        return JSON.parse(data) as CheckoutItem[];
      } catch (e) {
        console.error('Failed to parse checkout items from session storage', e);
        return null;
      }
    }
  }
  return null;
}

export function clearCheckoutItems(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(CHECKOUT_KEY);
  }
}
