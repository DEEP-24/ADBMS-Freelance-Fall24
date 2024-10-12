import { CheckCircleIcon, InformationCircleIcon, MinusCircleIcon } from "@heroicons/react/24/solid";
import type { Item } from "@prisma/client";
import { Link } from "@remix-run/react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { useLocalStorageState } from "~/utils/hooks";
import type { DateToString } from "~/utils/types";

const LocalStorageKey = "staff-food-truck-cart";

export type StaffCartItem = DateToString<Item>;

interface IStaffCartContext {
  itemsInCart: Array<StaffCartItem>;
  addItemToCart: (item: StaffCartItem) => void;
  removeItemFromCart: (itemId: StaffCartItem["id"]) => void;
  clearCart: () => void;
  totalPrice: number;
}

const StaffCartContext = React.createContext<IStaffCartContext | undefined>(undefined);

export function StaffCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useLocalStorageState<StaffCartItem[]>({
    key: LocalStorageKey,
    defaultValue: [],
  });

  const totalPrice = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const clearCart = React.useCallback(() => {
    toast.success("Successfully cleared!");
    setItems([]);
  }, [setItems]);

  const addItemToCart = React.useCallback(
    (item: StaffCartItem) => {
      const isOrderFromDifferentRestaurant = items.some(
        (cartItem) => cartItem.restaurantId !== item.restaurantId,
      );
      const isAlreadyInCart = items.some((i) => i.id === item.id);

      toast.success("Successfully cleared!");

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
    },
    [clearCart, items, setItems],
  );

  const removeItemFromCart = (itemId: StaffCartItem["id"]) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
    toast.success("Successfully removed");
  };

  return (
    <StaffCartContext.Provider
      value={{
        itemsInCart: items,
        totalPrice,
        addItemToCart,
        removeItemFromCart,
        clearCart,
      }}
    >
      {children}
    </StaffCartContext.Provider>
  );
}

export function useStaffCart() {
  const context = React.useContext(StaffCartContext);
  if (!context) {
    throw new Error("`useStaffCart()` must be used within a <StaffCartProvider />");
  }

  return context;
}
