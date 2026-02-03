# Transport System - Frontend

React + Vite frontend for Transport System Management.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- Backend API running on `http://localhost:5000`

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables (optional):**
   ```bash
   copy .env.example .env
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

App will run on `http://localhost:5173`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── CompanyForm.jsx   # Add/Edit company form
│   │   ├── CompanyList.jsx   # Company listing table
│   │   └── Navbar.jsx        # Navigation bar
│   ├── services/
│   │   └── api.js            # API integration layer
│   ├── utils/
│   │   └── validation.js     # Client-side validation
│   ├── App.jsx               # Main app with routing
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles
├── index.html
├── vite.config.js
└── package.json
```

## 🎨 Features

### Company List Page (`/`)
- View all companies in a table
- Edit and delete actions
- Empty state when no companies exist
- Loading states
- Error handling

### Add Company Page (`/add`)
- Form with all required fields
- Client-side validation
- Real-time error messages
- Mandatory field indicators (*)
- Success/error notifications

### Edit Company Page (`/edit/:id`)
- Pre-populated form with existing data
- Same validation as add form
- Update confirmation

## 🔌 API Integration

The app uses Axios for API calls. All API endpoints are configured in `src/services/api.js`.

### Environment Variables
```env
VITE_API_URL=http://localhost:5000/api
```

If not set, defaults to `http://localhost:5000/api`.

## ✅ Client-Side Validation

### Validation Rules

| Field             | Validation                                    |
|-------------------|-----------------------------------------------|
| Company Name      | Required, min 2 characters                   |
| Company Address 1 | Required, min 5 characters                   |
| Company Address 2 | Optional                                     |
| Place             | Required, min 2 characters                   |
| GST No            | Required, 15 chars, valid format             |
| PIN Code          | Required, 6 digits                           |
| Contact No        | Required, 10 digits (starts with 6-9)        |
| Email ID          | Required, valid email format                 |

### Validation Functions

Located in `src/utils/validation.js`:
- `validateGST(gst)` - GST number validation
- `validatePinCode(pinCode)` - PIN code validation
- `validateContactNo(contact)` - Contact number validation
- `validateEmail(email)` - Email validation
- `validateCompanyForm(formData)` - Complete form validation

## 🎨 Styling

The app uses **Vanilla CSS** with a modern, clean design:

- CSS variables for consistent theming
- Responsive design (mobile-friendly)
- Form validation states
- Loading and error states
- Table with hover effects
- Button variants (primary, secondary, danger)

### CSS Variables
```css
--primary-color: #2563eb
--danger-color: #dc2626
--success-color: #16a34a
--border-color: #e5e7eb
--text-primary: #1f2937
--text-secondary: #6b7280
```

## 🧭 Routing

Uses **React Router v6**:

| Route        | Component     | Description           |
|--------------|---------------|-----------------------|
| `/`          | CompanyList   | List all companies    |
| `/add`       | CompanyForm   | Add new company       |
| `/edit/:id`  | CompanyForm   | Edit existing company |

## 📦 Dependencies

- **react** - UI library
- **react-dom** - React DOM renderer
- **react-router-dom** - Client-side routing
- **axios** - HTTP client
- **vite** - Build tool
- **@vitejs/plugin-react** - Vite React plugin

## 🛠️ Development

### Development Server
```bash
npm run dev
```
- Hot Module Replacement (HMR) enabled
- Runs on `http://localhost:5173`
- Proxy configured for `/api` requests

### Production Build
```bash
npm run build
```
Output in `dist/` folder

### Preview Production Build
```bash
npm run preview
```

## ⚙️ Vite Configuration

The app includes:
- React plugin for Fast Refresh
- API proxy to backend (`/api` → `http://localhost:5000`)
- Port configuration (5173)

## 🎯 Component Details

### CompanyForm
- Handles both add and edit modes
- Form state management with React hooks
- Real-time validation
- Error display for each field
- Loading states during submission
- Success/error notifications
- Cancel button to navigate back

### CompanyList
- Fetches and displays all companies
- Table layout with responsive design
- Edit and delete actions
- Confirmation dialog for delete
- Empty state when no data
- Loading indicator
- Error handling

### Navbar
- Navigation links
- Active route highlighting
- Responsive design

## 🐛 Error Handling

- API errors are caught and displayed to users
- Validation errors shown inline with form fields
- Network errors show user-friendly messages
- Loading states prevent multiple submissions

## 📱 Responsive Design

The app is fully responsive:
- Mobile-first approach
- Breakpoint at 768px
- Stacked forms on mobile
- Responsive table
- Touch-friendly buttons

## 🔧 Customization

### Change API URL
Edit `VITE_API_URL` in `.env` file

### Change Port
Edit `vite.config.js`:
```js
server: {
  port: 3000  // Change to your preferred port
}
```

### Styling
All styles are in `src/index.css`. Modify CSS variables for quick theme changes.

## 📝 Notes

- Form validation happens on both client and server side
- All mandatory fields are marked with `*`
- Unique constraint violations are handled gracefully
- Success messages auto-dismiss after 1.5 seconds
