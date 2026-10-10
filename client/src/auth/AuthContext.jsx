import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState
} from 'react';
import api, { refreshSession, setAccessToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function restoreSession() {
            try {
                await refreshSession();
                const response = await api.get('/auth/me');

                if (active) {
                    setUser(response.data.data.user);
                }
            } catch {
                setAccessToken(null);

                if (active) {
                    setUser(null);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        restoreSession();

        return () => {
            active = false;
        };
    }, []);

    const signIn = useCallback(async ({ email, password }) => {
        const response = await api.post('/auth/login', { email, password });
        const data = response.data.data;

        setAccessToken(data.accessToken);
        setUser(data.user);

        return data.user;
    }, []);

    const signUp = useCallback(async ({ displayName, email, password }) => {
        const response = await api.post('/auth/register', {
            displayName,
            email,
            password
        });
        const data = response.data.data;

        setAccessToken(data.accessToken);
        setUser(data.user);

        return data.user;
    }, []);

    const updateUser = useCallback((updated) => {
        setUser(current => current ? { ...current, ...updated } : updated);
    }, []);

    const signOut = useCallback(async () => {
        try {
            await api.post('/auth/logout');
        } finally {
            setAccessToken(null);
            setUser(null);
        }
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        signIn,
        signUp,
        signOut,
        updateUser
    }), [user, loading, signIn, signUp, signOut, updateUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider.');
    }

    return context;
}
