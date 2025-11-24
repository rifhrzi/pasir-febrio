import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Income from './pages/Income.jsx';
import Expense from './pages/Expense.jsx';
import Loans from './pages/Loans.jsx';
import Revenue from './pages/Revenue.jsx';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/income"
        element={
          <PrivateRoute>
            <Income />
          </PrivateRoute>
        }
      />
      <Route
        path="/expense"
        element={
          <PrivateRoute>
            <Expense />
          </PrivateRoute>
        }
      />
      <Route
        path="/loans"
        element={
          <PrivateRoute>
            <Loans />
          </PrivateRoute>
        }
      />
      <Route
        path="/revenue"
        element={
          <PrivateRoute>
            <Revenue />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
