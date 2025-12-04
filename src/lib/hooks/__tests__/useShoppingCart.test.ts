import { renderHook, act } from '@testing-library/react';
import { useShoppingCart } from '../useShoppingCart';

describe('useShoppingCart', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('should initialize with empty cart', () => {
    const { result } = renderHook(() => useShoppingCart());

    expect(result.current.items).toEqual([]);
    expect(result.current.getTotal()).toBe(0);
    expect(result.current.getItemCount()).toBe(0);
  });

  it('should add item to cart', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addItem({
        productId: 'test-product-1',
        name: 'Test Product',
        price: 29.99,
        imageUrl: 'https://example.com/image.jpg',
      });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.getItemCount()).toBe(1);
    expect(result.current.getTotal()).toBe(29.99);
  });

  it('should increment quantity when adding same item', () => {
    const { result } = renderHook(() => useShoppingCart());

    const item = {
      productId: 'test-product-1',
      name: 'Test Product',
      price: 29.99,
      imageUrl: 'https://example.com/image.jpg',
    };

    act(() => {
      result.current.addItem(item);
      result.current.addItem(item);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.getItemCount()).toBe(2);
    expect(result.current.getTotal()).toBe(59.98);
  });

  it('should remove item from cart', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addItem({
        productId: 'test-product-1',
        name: 'Test Product',
        price: 29.99,
        imageUrl: 'https://example.com/image.jpg',
      });
    });

    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.removeItem('test-product-1');
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.getTotal()).toBe(0);
  });

  it('should update item quantity', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addItem({
        productId: 'test-product-1',
        name: 'Test Product',
        price: 29.99,
        imageUrl: 'https://example.com/image.jpg',
      });
    });

    act(() => {
      result.current.updateQuantity('test-product-1', 3);
    });

    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.getItemCount()).toBe(3);
    expect(result.current.getTotal()).toBeCloseTo(89.97, 2);
  });

  it('should remove item when updating quantity to 0', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addItem({
        productId: 'test-product-1',
        name: 'Test Product',
        price: 29.99,
        imageUrl: 'https://example.com/image.jpg',
      });
    });

    act(() => {
      result.current.updateQuantity('test-product-1', 0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('should clear cart', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addItem({
        productId: 'test-product-1',
        name: 'Test Product 1',
        price: 29.99,
        imageUrl: 'https://example.com/image.jpg',
      });
      result.current.addItem({
        productId: 'test-product-2',
        name: 'Test Product 2',
        price: 39.99,
        imageUrl: 'https://example.com/image2.jpg',
      });
    });

    expect(result.current.items).toHaveLength(2);

    act(() => {
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.getTotal()).toBe(0);
  });

  it('should calculate correct total for multiple items', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addItem({
        productId: 'test-product-1',
        name: 'Test Product 1',
        price: 24.99,
        imageUrl: 'https://example.com/image.jpg',
      });
      result.current.addItem({
        productId: 'test-product-2',
        name: 'Test Product 2',
        price: 49.99,
        imageUrl: 'https://example.com/image2.jpg',
      });
      result.current.updateQuantity('test-product-1', 2);
    });

    // 24.99 * 2 + 49.99 = 99.97
    expect(result.current.getTotal()).toBeCloseTo(99.97, 2);
    expect(result.current.getItemCount()).toBe(3);
  });

  it('should persist cart to localStorage', () => {
    const { result } = renderHook(() => useShoppingCart());

    act(() => {
      result.current.addItem({
        productId: 'test-product-1',
        name: 'Test Product',
        price: 29.99,
        imageUrl: 'https://example.com/image.jpg',
      });
    });

    // Check localStorage
    const storedData = localStorage.getItem('tax-genius-cart');
    expect(storedData).toBeTruthy();

    const parsed = JSON.parse(storedData!);
    expect(parsed.state.items).toHaveLength(1);
    expect(parsed.state.items[0].productId).toBe('test-product-1');
  });

  it('should restore cart from localStorage', () => {
    // Manually set localStorage
    const cartData = {
      state: {
        items: [
          {
            productId: 'test-product-1',
            name: 'Test Product',
            price: 29.99,
            quantity: 2,
            imageUrl: 'https://example.com/image.jpg',
          },
        ],
      },
      version: 0,
    };

    localStorage.setItem('tax-genius-cart', JSON.stringify(cartData));

    // Render hook - should restore from localStorage
    const { result } = renderHook(() => useShoppingCart());

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.getTotal()).toBeCloseTo(59.98, 2);
  });
});
