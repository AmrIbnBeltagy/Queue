/**
 * Application Constants
 * Central location for all application constants
 */

module.exports = {
  // Ticket Types
  TICKET_TYPES: {
    EXAMINATION: 'Examination',
    CONSULTATION: 'Consultation',
    PROCEDURE: 'Procedure',
    LATE: 'Late'
  },

  // Ticket Statuses
  TICKET_STATUS: {
    WAITING: 'waiting',
    CALLED: 'called',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
  },

  // Ticket Type Prefixes
  TICKET_PREFIXES: {
    Examination: 'E',
    Consultation: 'C',
    Procedure: 'P',
    Late: 'L'
  },

  // Ticket Type Colors (for UI)
  TICKET_COLORS: {
    Examination: '#007bff',
    Consultation: '#28a745',
    Procedure: '#ffc107',
    Late: '#dc3545'
  },

  // User Roles
  USER_ROLES: {
    ADMIN: 'admin',
    PHYSICIAN: 'physician',
    RECEPTIONIST: 'receptionist'
  },

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  },

  // Date Formats
  DATE_FORMATS: {
    ISO: 'YYYY-MM-DD',
    DISPLAY: 'DD/MM/YYYY',
    DATETIME: 'YYYY-MM-DD HH:mm:ss'
  }
};

