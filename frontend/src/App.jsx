import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CompanyList from './components/CompanyList';
import ProductList from './components/ProductList';
import DriverList from './components/DriverList';
import PumpList from './components/PumpList';
import PlaceList from './components/PlaceList';
import DealerList from './components/DealerList';
import VehicleList from './components/VehicleList';
import OwnerList from './components/OwnerList';
import BankList from './components/BankList';
import RateCardList from './components/RateCardList';
import TemplatesPage from './components/TemplatesPage';
import LoadingAdvance from './components/LoadingAdvance';
import LoadingAdvanceDetail from './components/LoadingAdvanceDetail';
import Acknowledgement from './components/Acknowledgement';
import DedicatedMarketSettlement from './components/DedicatedMarketSettlement';
import OwnVehicleSettlement from './components/OwnVehicleSettlement';
import BalanceSettlement from './components/BalanceSettlement';
import LoanMaster from './components/LoanMaster';
import LoanRepayment from './components/LoanRepayment';
import GlobalDialogProvider from './components/common/GlobalDialogProvider';

function App() {
    const isAuthenticated = () => Boolean(localStorage.getItem('auth_user'));

    const RequireAuth = ({ children }) => {
        return isAuthenticated() ? children : <Navigate to="/login" replace />;
    };

    const ProtectedLayout = () => (
        <RequireAuth>
            <Layout />
        </RequireAuth>
    );

    return (
        <Router>
            <GlobalDialogProvider>
                <div className="App">
                    <Routes>
                        <Route
                            path="/login"
                            element={isAuthenticated() ? <Navigate to="/" replace /> : <Login />}
                        />
                        <Route element={<ProtectedLayout />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/masters/company" element={<CompanyList />} />
                            <Route path="/masters/products" element={<ProductList />} />
                            <Route path="/masters/drivers" element={<DriverList />} />
                            <Route path="/masters/pumps" element={<PumpList />} />
                            <Route path="/masters/places" element={<PlaceList />} />
                            <Route path="/masters/dealers" element={<DealerList />} />
                            <Route path="/masters/vehicles" element={<VehicleList />} />
                            <Route path="/masters/owners" element={<OwnerList />} />
                            <Route path="/masters/banks" element={<BankList />} />
                            <Route path="/masters/rate-cards" element={<RateCardList />} />
                            <Route path="/transactions/loading-advance" element={<LoadingAdvance />} />
                            <Route path="/transactions/loading-advance/:id" element={<LoadingAdvanceDetail />} />
                            <Route path="/transactions/acknowledgement" element={<Acknowledgement />} />
                            <Route path="/transactions/balance-settlement" element={<BalanceSettlement />} />
                            <Route path="/transactions/dedicated-market-settlement" element={<DedicatedMarketSettlement />} />
                            <Route path="/transactions/own-vehicle-settlement" element={<OwnVehicleSettlement />} />
                            <Route path="/advances-loans/loan-master" element={<LoanMaster />} />
                            <Route path="/advances-loans/loan-repayment" element={<LoanRepayment />} />
                            <Route path="/templates" element={<TemplatesPage />} />
                        </Route>
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </GlobalDialogProvider>
        </Router>
    );
}

export default App;
