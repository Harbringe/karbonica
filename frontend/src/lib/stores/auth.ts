import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { api } from '$lib/api/client';

export type UserRole = 'developer' | 'verifier' | 'administrator' | 'buyer';

export interface User {
    id: string;
    email: string;
    name: string;
    company: string | null;
    role: UserRole;
    emailVerified: boolean;
    lastLoginAt: string | null;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    loading: boolean;
    initialized: boolean;
}

const STORAGE_KEY = 'karbonica_auth';

function createAuthStore() {
    const initialState: AuthState = {
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        initialized: false,
    };

    const { subscribe, set, update } = writable<AuthState>(initialState);

    // Load from localStorage on init
    function initialize() {
        if (!browser) return;

        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                api.setAccessToken(data.accessToken);
                update(state => ({
                    ...state,
                    ...data,
                    loading: false,
                    initialized: true,
                }));
            } catch {
                localStorage.removeItem(STORAGE_KEY);
                update(state => ({ ...state, initialized: true }));
            }
        } else {
            update(state => ({ ...state, initialized: true }));
        }
    }

    // Save to localStorage
    function persist(state: AuthState) {
        if (!browser) return;

        if (state.user && state.accessToken) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
            }));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    return {
        subscribe,

        initialize,

        async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
            update(state => ({ ...state, loading: true }));

            const response = await api.login(email, password);

            if (response.status === 'success' && response.data) {
                const { user, tokens } = response.data;
                api.setAccessToken(tokens.accessToken);

                const newState: AuthState = {
                    user: user as User,
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    loading: false,
                    initialized: true,
                };

                set(newState);
                persist(newState);

                return { success: true };
            }

            update(state => ({ ...state, loading: false }));
            return { success: false, error: response.error?.message || 'Login failed' };
        },

        async register(data: { email: string; password: string; name: string; company?: string; role: string }): Promise<{ success: boolean; error?: string }> {
            update(state => ({ ...state, loading: true }));

            const response = await api.register(data);

            update(state => ({ ...state, loading: false }));

            if (response.status === 'success') {
                return { success: true };
            }

            return { success: false, error: response.error?.message || 'Registration failed' };
        },

        async refreshSession(): Promise<boolean> {
            const state = get({ subscribe });
            if (!state.refreshToken) return false;

            const response = await api.refreshToken(state.refreshToken);

            if (response.status === 'success' && response.data) {
                api.setAccessToken(response.data.accessToken);

                update(s => {
                    const newState = { ...s, accessToken: response.data!.accessToken };
                    persist(newState);
                    return newState;
                });

                return true;
            }

            // Refresh failed, logout
            this.logout();
            return false;
        },

        logout() {
            api.setAccessToken(null);
            const newState: AuthState = {
                user: null,
                accessToken: null,
                refreshToken: null,
                loading: false,
                initialized: true,
            };
            set(newState);
            persist(newState);
        },

        setLoading(loading: boolean) {
            update(state => ({ ...state, loading }));
        },
    };
}

export const auth = createAuthStore();

// Derived stores for convenience
export const user = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isLoading = derived(auth, $auth => $auth.loading);
export const userRole = derived(auth, $auth => $auth.user?.role || null);
