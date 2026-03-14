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
                    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
                        user.store_name = dbUser.store_name;
                        user.username = dbUser.username;
                        // Map User Profile Image to photoURL (Separate from Store Image)
                        if (dbUser.profile_image_url) user.photoURL = dbUser.profile_image_url;
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
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
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
                    const updatedUser = {
                        ...currentUser,
                        role: dbUser.role,
                        dbId: dbUser.id,
                        username: dbUser.username,
                        photoURL: dbUser.store_image_url || currentUser.photoURL
                    };
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