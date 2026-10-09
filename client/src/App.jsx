import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthPage from './auth/AuthPage';
import Workspace from './Workspace';

function AccessRoutes() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
                    Checking your session...
                </div>
            </main>
        );
    }

    return (
        <Routes>
            <Route
                path="/login"
                element={user
                    ? <Navigate to="/" replace />
                    : <AuthPage mode="login" />}
            />
            <Route
                path="/register"
                element={user
                    ? <Navigate to="/" replace />
                    : <AuthPage mode="register" />}
            />
            <Route
                path="/*"
                element={user
                    ? <Workspace />
                    : <Navigate to="/login" replace state={{ from: location }} />}
            />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AccessRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}
