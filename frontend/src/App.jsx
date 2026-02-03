import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import CompanyList from './components/CompanyList';
import CompanyForm from './components/CompanyForm';

function App() {
    return (
        <Router>
            <div className="App">
                <Navbar />
                <Routes>
                    <Route path="/" element={<CompanyList />} />
                    <Route path="/add" element={<CompanyForm />} />
                    <Route path="/edit/:id" element={<CompanyForm />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
