# Queue Management System

A professional queue management system for healthcare facilities with real-time patient tracking and calling sequence management.

## 📁 Project Structure

```
QueueProject/
├── config/                 # Configuration files
│   └── database.js
├── controllers/            # Route controllers (business logic)
├── middleware/            # Custom middleware
├── models/                # Mongoose models
├── routes/                # Express route definitions
├── services/              # Business logic services
├── validators/            # Input validation
├── scripts/               # Utility scripts
├── public/                # Frontend assets
│   ├── pages/            # HTML pages
│   ├── scripts/          # JavaScript files
│   │   ├── pages/        # Page-specific scripts
│   │   ├── services/     # API service modules
│   │   ├── components/   # Reusable components
│   │   └── utils/        # Utility functions
│   ├── styles/           # CSS files
│   └── assets/           # Images, fonts, etc.
├── server.js              # Application entry point
└── package.json          # Dependencies
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   ```bash
   cp config.env.example config.env
   # Edit config.env with your settings
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Access the application at `http://localhost:3000`

## 📚 Features

- **Queue Management**: Real-time patient queue tracking
- **Calling Sequence**: Configurable patient calling sequence
- **Physician Dashboard**: Comprehensive dashboard for physicians
- **Ticket Printing**: Print and manage patient tickets
- **Door Signage**: Display current patient on door screens
- **Admin Panel**: Full administration interface

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Authentication**: Session-based authentication

## 📝 API Documentation

API endpoints are organized by feature:
- `/api/users` - User management
- `/api/tickets` - Ticket operations
- `/api/physician-dashboard` - Physician dashboard data
- `/api/calling-sequences` - Calling sequence configuration
- `/api/today-physician-schedules` - Today's schedules

## 🤝 Contributing

1. Follow the project structure
2. Write clean, documented code
3. Test your changes
4. Submit pull requests

## 📄 License

Proprietary - All rights reserved
