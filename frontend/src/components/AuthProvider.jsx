import { createContext, useEffect, useState } from "react";
import { auth } from "../firebase";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Fetch user logic from our DB to get the role
                try {
                    const API_URL = 'https://c4772cc6-1f1b-44f4-8b39-7a97086b8204-00-260uyq3aib74z.pike.replit.dev'; 

                    const res = await fetch(`${API_URL}/users`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            firebase_uid: user.uid,
                            email: user.email,
                            role: 'buyer' // Default, won't overwrite if exists
                        })
                    });

                    if (res.ok) {
                        const dbUser = await res.json();
                        user.role = dbUser.role;
                        user.dbId = dbUser.id;
                    }
                } catch (err) {
                    console.error("Failed to fetch user role", err);
                }
            }

            setCurrentUser(user);
            setLoading(false);
        });
    }, []);

    // Function to reload user data (useful after role upgrade)
    const refreshUser = async () => {
        if (currentUser) {
            try {
                const API_URL = 'https://c4772cc6-1f1b-44f4-8b39-7a97086b8204-00-260uyq3aib74z.pike.replit.dev';
                // GET user by logic (using the POST trick again or explicit GET)
                // Let's stick to the POST update-or-get pattern for simplicity as we implemented it
                const res = await fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firebase_uid: currentUser.uid,
                        email: currentUser.email,
                        role: 'customer'
                    })
                });
                if (res.ok) {
                    const dbUser = await res.json();
                    const updatedUser = { ...currentUser, role: dbUser.role, dbId: dbUser.id };
                    setCurrentUser(updatedUser);
                }
            } catch (err) {
                console.error("Failed to refresh user", err);
            }
        }
    }

    const value = { currentUser, refreshUser };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}