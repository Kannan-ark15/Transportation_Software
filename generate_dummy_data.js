import * as XLSX from 'xlsx';

// Dummy data matching strict constraints in Vehicle Master
const data = [
    {
        "Vehicle No": "TN01AB1111",
        "Type": "LCV",
        "Sub Type": "6 WHEELER",
        "Body Type": "Open Container",
        "Brand": "Tata",
        "Category": "Own",
        "Owner": "Admin Services",
        "Recommended KM": 100,
        "Year": 2022,
        "Engine No": "ENG1001",
        "Chasis No": "CHS1001",
        "RC Expiry": new Date("2026-12-31"),
        "Pollution No": "PUC1001",
        "Pollution Expiry": new Date("2025-06-30"),
        "Permit No": "PER1001",
        "Permit From": new Date("2023-01-01"),
        "Permit Till": new Date("2028-01-01"),
        "FC No": "FC1001",
        "FC From": new Date("2024-01-01"),
        "FC Till": new Date("2026-01-01"),
        "Insurance No": "INS1001",
        "Insurance Base Value": 50000,
        "GST %": 18,
        "Insurance Amount": 59000
    },
    {
        "Vehicle No": "TN01AB2222",
        "Type": "HCV",
        "Sub Type": "14 WHEELER",
        "Body Type": "Container",
        "Brand": "Ashok Leyland",
        "Category": "Dedicated",
        "Owner": "External Partner A",
        "Recommended KM": 200,
        "Year": 2023,
        "Engine No": "ENG2002",
        "Chasis No": "CHS2002",
        "RC Expiry": "2027-12-31", // String format test
        "Pollution No": "PUC2002",
        "Pollution Expiry": "2025-12-31",
        "Permit No": "PER2002",
        "Permit From": "2023-05-01",
        "Permit Till": "2028-05-01",
        "FC No": "FC2002",
        "FC From": "2024-05-01",
        "FC Till": "2026-05-01",
        "Insurance No": "INS2002",
        "Insurance Base Value": 80000,
        "GST %": 18,
        "Insurance Amount": 94400
    }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicles");

XLSX.writeFile(workbook, "d:\\Transport\\vehicle_dummy_import.xlsx");
console.log("Dummy Excel file created at d:\\Transport\\vehicle_dummy_import.xlsx");
