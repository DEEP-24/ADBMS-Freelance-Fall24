import { InformationCircleIcon } from "@heroicons/react/24/solid";
import type { Item } from "@prisma/client";
import { Link } from "@remix-run/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { useLocalStorageState } from "~/utils/hooks";
import type { DateToString } from "~/utils/types";

const LocalStorageKey = "food-truck-cart";

export type CartItem = DateToString<Item>;

interface ICartContext {
  itemsInCart: Array<CartItem>;
  addItemToCart: (item: CartItem) => void;
  removeItemFromCart: (itemId: CartItem["id"]) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: number;
}

const CartContext = React.createContext<ICartContext | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useLocalStorageState<CartItem[]>({
    key: LocalStorageKey,
    defaultValue: [],
  });

  const totalPrice = React.useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items],
  );

  const clearCart = React.useCallback(() => {
    setItems([]);
    toast.success("Successfully cleared!");
  }, [setItems]);

  const addItemToCart = React.useCallback(
    (item: CartItem) => {
      const isOrderFromDifferentRestaurant = items.some(
        (cartItem) => cartItem.restaurantId !== item.restaurantId,
      );
      const isAlreadyInCart = items.some((i) => i.id === item.id);

      if (isOrderFromDifferentRestaurant) {
        toast(
          <div className="space-y-2">
            <span>You can only order from one restaurant at a time</span>
            <div className="flex items-center gap-4">
              <Button
                color="red"
                onClick={async () => {
                  clearCart();
                  toast.dismiss("different-restaurant");
                }}
              >
                Clear previous order
              </Button>

              <Button color="blue" size="sm" onClick={() => toast.dismiss("different-restaurant")}>
                <Link to="/cart">View cart</Link>
              </Button>
            </div>
          </div>,
          {
            id: "different-restaurant",
            description: "You can only order from one restaurant at a time",
            icon: <InformationCircleIcon className="h-9 w-9" />,
          },
        );
        return;
      }

      if (!isAlreadyInCart) {
        setItems((prev) => [...prev, item]);
        toast.success(`Added ${item.name} to cart`);
        return;
      }

      setItems((prevItems) => {
        const newItems = [...prevItems];

        const index = newItems.findIndex((i) => i.id === item.id);
        if (index > -1) {
          newItems[index].quantity = newItems[index].quantity + item.quantity;
        }

        return newItems;
      });

      toast.success(`Quantity increased by ${item.quantity}`);
    },
    [clearCart, items, setItems],
  );

  const removeItemFromCart = (itemId: CartItem["id"]) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.success("Item removed from cart");
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItems((currentItems) => {
      return currentItems.map((item) => {
        if (item.id === itemId) {
          return { ...item, quantity };
        }
        return item;
      });
    });
  };

  return (
    <CartContext.Provider
      value={{
        itemsInCart: items,
        totalPrice,
        addItemToCart,
        removeItemFromCart,
        updateItemQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("`useCart()` must be used within a <CartProvider />");
  }

  return context;
}
