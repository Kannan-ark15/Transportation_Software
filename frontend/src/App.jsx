import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
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

function App() {
    return (
        <Router>
            <div className="App">
                <Layout>
                    <Routes>
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
                        <Route path="/templates" element={<TemplatesPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </div>
        </Router>
    );
}

export default App;
