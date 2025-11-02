# Project Structure Guide

## 📁 Professional Project Organization

This document outlines the professional structure of the Queue Management System project.

### Root Level Structure

```
QueueProject/
├── config/              # Configuration files
│   ├── database.js     # Database connection
│   ├── app.js          # App configuration
│   └── constants.js    # Application constants
│
├── controllers/        # Route controllers (handle HTTP requests/responses)
│   ├── authController.js
│   ├── ticketController.js
│   ├── physicianController.js
│   └── ...
│
├── services/           # Business logic layer
│   ├── ticketService.js
│   ├── physicianService.js
│   └── ...
│
├── middleware/         # Custom middleware
│   ├── auth.js         # Authentication middleware
│   ├── validation.js   # Request validation
│   └── errorHandler.js # Error handling
│
├── validators/         # Input validation schemas
│   ├── ticketValidator.js
│   └── ...
│
├── models/             # Mongoose models
│   ├── Ticket.js
│   ├── User.js
│   └── ...
│
├── routes/             # Express route definitions
│   ├── index.js        # Route aggregator
│   ├── ticketRoutes.js
│   └── ...
│
├── scripts/            # Utility scripts
│   └── seedData.js
│
├── public/             # Frontend assets
│   ├── pages/         # HTML pages
│   ├── scripts/       # JavaScript files
│   ├── styles/        # CSS files
│   └── assets/        # Static assets
│
├── server.js           # Application entry point
├── package.json        # Dependencies
└── README.md          # Project documentation
```

### Frontend Structure (`public/`)

```
public/
├── pages/                      # HTML pages
│   ├── admin/
│   │   ├── users.html
│   │   └── configuration.html
│   ├── physician/
│   │   ├── dashboard.html
│   │   ├── schedule.html
│   │   └── today-schedule.html
│   ├── tickets/
│   │   └── print-ticket.html
│   ├── displays/
│   │   ├── monitors.html
│   │   └── door-signage.html
│   └── auth/
│       └── login.html
│
├── scripts/                    # JavaScript files
│   ├── pages/                  # Page-specific scripts
│   │   ├── admin/
│   │   ├── physician/
│   │   ├── tickets/
│   │   └── displays/
│   ├── services/               # API service modules
│   │   ├── api.js
│   │   ├── ticketService.js
│   │   └── physicianService.js
│   ├── components/             # Reusable components
│   │   ├── global-header.js
│   │   └── alert-system.js
│   └── utils/                  # Utility functions
│       ├── dom-utils.js
│       ├── loading-overlay.js
│       └── helpers.js
│
├── styles/                     # CSS files
│   ├── main.css               # Main stylesheet
│   ├── components.css         # Component styles
│   └── themes.css             # Theme variations
│
└── assets/                     # Static assets
    ├── images/
    │   ├── logo.png
    │   └── ...
    └── fonts/
```

### Backend Structure

#### Controllers Pattern
Controllers handle HTTP requests and responses. They should be thin and delegate business logic to services.

#### Services Pattern
Services contain business logic and interact with models. They can be reused across different controllers.

#### Models Pattern
Models define data structures and database schemas using Mongoose.

#### Routes Pattern
Routes define API endpoints and connect them to controllers.

## 📝 Naming Conventions

- **Files**: camelCase (e.g., `ticketService.js`)
- **Directories**: kebab-case (e.g., `physician-dashboard/`)
- **Classes**: PascalCase (e.g., `TicketController`)
- **Functions/Variables**: camelCase (e.g., `getTicketById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)

## 🎯 Best Practices

1. **Separation of Concerns**: Keep controllers, services, and models separate
2. **DRY Principle**: Don't repeat code, use services and utilities
3. **Error Handling**: Centralize error handling in middleware
4. **Validation**: Validate inputs in validators before processing
5. **Documentation**: Document complex functions and APIs

