# SmartStock – Smart Inventory & Sales Analytics Platform

SmartStock is an enterprise-grade, production-quality Inventory & Sales Analytics Platform built with Next.js, Express, TypeScript, Prisma, and PostgreSQL. It empowers retail and wholesale businesses to manage products, track multi-channel inventory, record sales/purchases with strict ACID database transactions, and gain actionable business intelligence through real-time analytics.

---

## 🛠️ Architecture & Tech Stack

### Frontend (`/frontend`)
- **Framework:** Next.js (App Router)
- **Language:** TypeScript (Strict)
- **Styling:** Tailwind CSS + Lucide Icons
- **State & Forms:** React Hook Form, Zod Validation
- **HTTP Client:** Axios
- **Analytics Visualization:** Recharts

### Backend (`/backend`)
- **Runtime:** Node.js + Express.js
- **Language:** TypeScript (Strict)
- **Database ORM:** Prisma ORM
- **Database:** PostgreSQL
- **Security:** Helmet, CORS, JWT Auth, Bcrypt Password Hashing
- **Validation:** Zod Schema Validation
- **Logging:** Morgan

### Analytics Engine (`/analytics`)
- Python / Pandas for advanced offline sales forecasting and Power BI dataset export preparation.

---

## 📁 Repository Directory Structure

```
SmartStock/
├── frontend/             # Next.js frontend web application
├── backend/              # Express + Prisma REST API backend service
├── analytics/            # Python & Pandas data analytics scripts
├── docs/                 # API documentation & architecture specifications
├── screenshots/          # Platform visual showcases & UI mockups
├── .gitignore            # Git exclusion rules
├── README.md             # Project documentation
└── DEVELOPMENT_PLAN.md   # 27-Phase implementation roadmap
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (v14+)
- npm or yarn

### Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Update DATABASE_URL and JWT_SECRET in .env
npx prisma migrate dev
npm run dev
```

### Setup Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## 🗺️ 27-Phase Development Roadmap

For the complete architectural breakdown and implementation roadmap, refer to [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).
