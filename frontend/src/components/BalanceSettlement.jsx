import React, { useMemo, useState } from 'react';
import DedicatedMarketSettlement from './DedicatedMarketSettlement';
import OwnVehicleSettlement from './OwnVehicleSettlement';
import { Button } from '@/components/ui/button';

const BalanceSettlement = () => {
    const [activeSection, setActiveSection] = useState('dedicated_market');

    const title = useMemo(
        () => (activeSection === 'dedicated_market'
            ? 'Dedicated & Market Vehicles'
            : 'Own Vehicles'),
        [activeSection]
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant={activeSection === 'dedicated_market' ? 'default' : 'outline'}
                    onClick={() => setActiveSection('dedicated_market')}
                >
                    Dedicated & Market Vehicles
                </Button>
                <Button
                    type="button"
                    variant={activeSection === 'own' ? 'default' : 'outline'}
                    onClick={() => setActiveSection('own')}
                >
                    Own Vehicles
                </Button>
            </div>

            <div className="text-sm text-slate-500 font-medium">
                Balance Settlement / {title}
            </div>

            {activeSection === 'dedicated_market' ? <DedicatedMarketSettlement /> : <OwnVehicleSettlement />}
        </div>
    );
};

export default BalanceSettlement;

