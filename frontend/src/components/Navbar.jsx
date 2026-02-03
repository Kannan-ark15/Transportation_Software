import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? 'active' : '';
    };

    return (
        <nav className="navbar">
            <div className="navbar-content">
                <Link to="/" className="navbar-brand">
                    🚚 Transport System
                </Link>
                <ul className="navbar-nav">
                    <li>
                        <Link to="/" className={`nav-link ${isActive('/')}`}>
                            Companies
                        </Link>
                    </li>
                    <li>
                        <Link to="/add" className={`nav-link ${isActive('/add')}`}>
                            Add Company
                        </Link>
                    </li>
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
