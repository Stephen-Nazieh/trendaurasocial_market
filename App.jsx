import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

// --- Global Firebase Variables (Provided by Canvas Environment) ---
// Note: These variables are assumed to be defined in the runtime environment.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Constants ---
const ITEM_ID = 'homepage-featured-product-42';

/**
 * Utility function to wait with exponential backoff for API calls.
 * @param {Function} apiCall - The function to call.
 * @param {number} retries - Number of retries remaining.
 */
const exponentialBackoff = async (apiCall, retries = 5) => {
    try {
        return await apiCall();
    } catch (error) {
        if (retries > 0) {
            const delay = Math.pow(2, 5 - retries) * 1000 + Math.random() * 1000;
            console.warn(`API call failed, retrying in ${delay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return exponentialBackoff(apiCall, retries - 1);
        } else {
            console.error("API call failed after all retries.", error);
            throw error;
        }
    }
};

const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isWished, setIsWished] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // 1. Initialize Firebase and Authentication
    useEffect(() => {
        try {
            if (Object.keys(firebaseConfig).length === 0) {
                setError("Firebase configuration is missing.");
                return;
            }

            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firestoreAuth = getAuth(app);

            setDb(firestoreDb);
            setAuth(firestoreAuth);

            // Authentication Listener
            const unsubscribe = firestoreAuth.onAuthStateChanged(async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    // Sign in anonymously if no token is available or user is not logged in
                    await exponentialBackoff(() => initialAuthToken ?
                        signInWithCustomToken(firestoreAuth, initialAuthToken) :
                        signInAnonymously(firestoreAuth)
                    );
                }
            });

            return () => unsubscribe(); // Cleanup auth listener
        } catch (e) {
            console.error("Firebase initialization failed:", e);
            setError("Failed to initialize the application.");
        }
    }, []);

    // 2. Setup Firestore listener for the wishlist state
    useEffect(() => {
        if (!db || !userId) return;

        // Path: /artifacts/{appId}/users/{userId}/wishlist_items/{ITEM_ID}
        const docRef = doc(db, 'artifacts', appId, 'users', userId, 'wishlist_items', ITEM_ID);

        const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                // Check if the item is explicitly marked as 'wished'
                setIsWished(!!data.wished);
            } else {
                // If the document doesn't exist, it's not wished
                setIsWished(false);
            }
            setIsLoading(false);
        }, (err) => {
            console.error("Error listening to wishlist data:", err);
            setError("Failed to load wishlist state.");
            setIsLoading(false);
        });

        return () => unsubscribe(); // Cleanup snapshot listener
    }, [db, userId]);


    // 3. Toggle the wishlist state and update Firestore
    const toggleWishlist = async () => {
        if (!db || !userId) {
            console.error("Database or User ID not ready.");
            return;
        }

        // We only allow setting it to TRUE (red) permanently, as per the request:
        // "when clicked it should be filled with red color permanently."
        if (isWished) {
            console.log("Item is already wished (red). No change needed.");
            return;
        }

        const docRef = doc(db, 'artifacts', appId, 'users', userId, 'wishlist_items', ITEM_ID);

        try {
            // Set the state to wished: true
            await exponentialBackoff(() => setDoc(docRef, {
                wished: true,
                timestamp: new Date().toISOString(),
                itemId: ITEM_ID
            }, { merge: true }));

            // UI state will be updated by the onSnapshot listener, but we can set it locally
            // for immediate feedback before the listener fires.
            setIsWished(true);

        } catch (e) {
            console.error("Failed to update wishlist:", e);
            setError("Could not save the wishlist change.");
        }
    };


    const heartClasses = isWished
        ? "text-red-500 fill-red-500" // Filled Red (Permanent state)
        : "text-gray-300 stroke-gray-400"; // Faint Outline (Initial state)

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-6 transition-all duration-300 hover:shadow-3xl">
                <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
                    Homepage Featured Product
                </h1>
                <p className="text-sm text-gray-500 mb-4 text-center">
                    User ID: <span className="font-mono text-xs p-1 bg-gray-100 rounded">{userId || 'Loading...'}</span>
                </p>
                <div className="relative overflow-hidden rounded-lg">
                    {/* Placeholder image that looks good */}
                    <img
                        src={`https://placehold.co/600x400/38bdf8/ffffff?text=Amazing+Item`}
                        alt="Featured Product"
                        className="w-full h-auto object-cover"
                        onError={(e) => e.target.src = `https://placehold.co/600x400/94a3b8/ffffff?text=Image+Load+Error`}
                    />

                    {/* The Wishlist Icon */}
                    <button
                        onClick={toggleWishlist}
                        disabled={isLoading || error !== null}
                        className={`absolute top-4 right-4 p-3 rounded-full bg-white/70 backdrop-blur-sm shadow-lg transition-all duration-300
                            ${!isWished ? 'hover:scale-110 hover:shadow-xl' : ''}
                            ${isLoading || error !== null || isWished ? 'cursor-default' : 'cursor-pointer'}
                        `}
                        aria-label={isWished ? "Item wished" : "Add to wishlist"}
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Heart
                                size={28}
                                strokeWidth={isWished ? 1 : 1.5}
                                className={`transition-all duration-500 ${heartClasses}`}
                                // Fill color for the red state
                                fill={isWished ? 'currentColor' : 'none'}
                            />
                        )}
                    </button>
                </div>

                <div className="mt-4">
                    <h2 className="text-2xl font-semibold text-gray-900">Premium Widget Pro</h2>
                    <p className="text-lg text-green-600 font-bold mt-1">$49.99</p>
                    <p className="text-gray-600 mt-2">
                        This is the description for the featured item on the homepage.
                        The wishlist state is saved to Firestore.
                    </p>

                    <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                        Wishlist Status: <strong>{isLoading ? 'Loading...' : (isWished ? 'WISHED (Red and Permanent)' : 'NOT WISHED (Faint Outline)')}</strong>
                    </div>

                    {error && (
                         <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-600 text-sm border border-red-300">
                             Error: {error}
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;