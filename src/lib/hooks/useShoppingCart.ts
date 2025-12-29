/**
 * Shopping Cart Hook
 *
 * Zustand-based shopping cart with localStorage persistence.
 * Provides cart state management for tax preparation product purchases.
 *
 * @module useShoppingCart
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Represents a single item in the shopping cart
 * @interface CartItem
 */
export interface CartItem {
  /** Unique product identifier */
  productId: string;
  /** Number of items in cart */
  quantity: number;
  /** Display name of the product */
  name: string;
  /** Unit price in dollars */
  price: number;
  /** URL to product image */
  imageUrl: string;
}

/**
 * Shopping cart state and actions
 * @interface ShoppingCartState
 */
interface ShoppingCartState {
  /** Array of cart items */
  items: CartItem[];
  /** Add item to cart (increments quantity if exists) */
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  /** Remove item from cart by product ID */
  removeItem: (productId: string) => void;
  /** Update quantity for a cart item */
  updateQuantity: (productId: string, quantity: number) => void;
  /** Clear all items from cart */
  clearCart: () => void;
  /** Calculate total price of all items */
  getTotal: () => number;
  /** Get total count of items in cart */
  getItemCount: () => number;
}

/**
 * Shopping cart store hook with localStorage persistence
 *
 * @returns {ShoppingCartState} Cart state and action methods
 * @example
 * ```tsx
 * const { items, addItem, getTotal } = useShoppingCart();
 *
 * // Add item to cart
 * addItem({ productId: 'tax-prep-basic', name: 'Basic Filing', price: 49.99, imageUrl: '/img/basic.jpg' });
 *
 * // Get cart total
 * const total = getTotal(); // Returns sum of (price * quantity)
 * ```
 */
export const useShoppingCart = create<ShoppingCartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => {
          // Check if item already exists in cart
          const existingItemIndex = state.items.findIndex((i) => i.productId === item.productId);

          if (existingItemIndex !== -1) {
            // Item exists - increment quantity
            const newItems = [...state.items];
            newItems[existingItemIndex] = {
              ...newItems[existingItemIndex],
              quantity: newItems[existingItemIndex].quantity + 1,
            };
            return { items: newItems };
          } else {
            // Item doesn't exist - add new item with quantity 1
            return {
              items: [...state.items, { ...item, quantity: 1 }],
            };
          }
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or negative
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getItemCount: () => {
        const state = get();
        return state.items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'tax-genius-cart', // localStorage key
      // Only persist the items array
      partialize: (state) => ({ items: state.items }),
    }
  )
);
