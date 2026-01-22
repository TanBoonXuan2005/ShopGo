import { createContext, useState, useEffect, useContext } from 'react';

export const CartContext = createContext();

export const useCart = () => {
    return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        // Initialize from local storage
        try {
            const stored = localStorage.getItem('cartItems');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error("Failed to parse cart from local storage", error);
            return [];
        }
    });

    useEffect(() => {
        // Save to local storage whenever cart changes
        localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }, [cartItems]);

    const addToCart = (product, quantity = 1) => {
        if (!product || !product.id) {
            console.error("Attempted to add invalid product to cart:", product);
            return;
        }

        console.log("Adding to cart:", product.name, quantity);

        setCartItems(prevItems => {
            // Ensure we compare IDs safely (handle string vs number)
            const existingItem = prevItems.find(item => String(item.id) === String(product.id));

            // Calculate Discounted Price
            const rawPrice = parseFloat(product.price);
            const discount = parseFloat(product.discount_percentage || 0);
            const finalPrice = discount > 0 ? rawPrice * (1 - discount / 100) : rawPrice;

            // Create item object with correct price
            const itemToAdd = {
                ...product,
                price: finalPrice, // Use discounted price for calculations/payment
                original_price: rawPrice // Keep original for UI display if needed
            };

            let newItems;
            if (existingItem) {
                newItems = prevItems.map(item =>
                    String(item.id) === String(product.id)
                        ? { ...item, quantity: item.quantity + quantity } 
                        : item
                );
                newItems = prevItems.map(item =>
                    String(item.id) === String(product.id)
                        ? { ...itemToAdd, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                newItems = [...prevItems, { ...itemToAdd, quantity }];
            }

            console.log("New Cart State:", newItems);
            return newItems;
        });
    };

    const removeFromCart = (productId) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return;
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === productId ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const getCartTotal = () => {
        return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const getCartCount = () => {
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    };

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
};
