# دليل نقل وتنظيم الملفات

## 📋 خطوات التنظيم

### 1. تنظيم ملفات Frontend

#### نقل HTML Pages
```bash
# نقل صفحات الإدارة
move public/admin-users.html → public/pages/admin/users.html
move public/configuration.html → public/pages/admin/configuration.html

# نقل صفحات الطبيب
move public/physician-dashboard.html → public/pages/physician/dashboard.html
move public/physician-schedule.html → public/pages/physician/schedule.html
move public/today-physician-schedule.html → public/pages/physician/today-schedule.html
move public/today-physician-schedule-management.html → public/pages/physician/schedule-management.html

# نقل صفحات التذاكر
move public/print-ticket.html → public/pages/tickets/print.html

# نقل صفحات العرض
move public/monitors.html → public/pages/displays/monitors.html
move public/door-signage.html → public/pages/displays/door-signage.html

# نقل صفحات المصادقة
move public/login.html → public/pages/auth/login.html

# نقل صفحات الإعدادات
move public/doctors.html → public/pages/settings/doctors.html
move public/clinics.html → public/pages/settings/clinics.html
move public/locations.html → public/pages/settings/locations.html
move public/specialities.html → public/pages/settings/specialities.html
move public/degrees.html → public/pages/settings/degrees.html
move public/agent-counters.html → public/pages/settings/agent-counters.html

# نقل صفحات الاختبار (يمكن حذفها لاحقاً)
move public/debug-user-info.html → public/pages/test/debug-user-info.html
move public/test-global-header.html → public/pages/test/test-global-header.html
move public/test-user-info.html → public/pages/test/test-user-info.html
```

#### نقل JavaScript Files
```bash
# صفحات الإدارة
move public/admin-users.js → public/scripts/pages/admin/users.js
move public/configuration.js → public/scripts/pages/admin/configuration.js

# صفحات الطبيب
move public/physician-dashboard.js → public/scripts/pages/physician/dashboard.js
move public/physician-schedule.js → public/scripts/pages/physician/schedule.js
move public/today-physician-schedule.js → public/scripts/pages/physician/today-schedule.js
move public/today-physician-schedule-management.js → public/scripts/pages/physician/schedule-management.js

# صفحات التذاكر
move public/print-ticket.js → public/scripts/pages/tickets/print.js

# صفحات العرض
move public/monitors.js → public/scripts/pages/displays/monitors.js

# نقل الخدمات المشتركة
move public/config.js → public/scripts/services/config.js

# نقل المكونات
move public/components/global-header.js → public/scripts/components/global-header.js
move public/alert-system.js → public/scripts/components/alert-system.js

# نقل الأدوات المساعدة
move public/utils/dom-utils.js → public/scripts/utils/dom-utils.js
move public/utils/loading-overlay.js → public/scripts/utils/loading-overlay.js
move public/utils/enhanced-loading.js → public/scripts/utils/enhanced-loading.js
move public/time-picker.js → public/scripts/utils/time-picker.js
move public/auth-check.js → public/scripts/utils/auth-check.js
move public/queue-config.js → public/scripts/utils/queue-config.js
move public/script.js → public/scripts/utils/helpers.js
```

#### نقل CSS Files
```bash
move public/styles.css → public/styles/main.css
move public/login.css → public/styles/auth.css
```

#### نقل Assets
```bash
move public/logo.png → public/assets/images/logo.png
move public/logo.jpg → public/assets/images/logo.jpg
move public/logo.jpeg → public/assets/images/logo.jpeg
move public/doctor_*.png → public/assets/images/doctors/
```

### 2. تحديث مسارات الملفات

بعد نقل الملفات، يجب تحديث جميع المراجع في:
- HTML files (script src, link href, img src)
- JavaScript files (imports, requires)
- CSS files (url(), @import)

### 3. إنشاء ملفات Configuration

```javascript
// config/constants.js
module.exports = {
  TICKET_TYPES: {
    EXAMINATION: 'Examination',
    CONSULTATION: 'Consultation',
    PROCEDURE: 'Procedure',
    LATE: 'Late'
  },
  TICKET_STATUS: {
    WAITING: 'waiting',
    CALLED: 'called',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
  }
};
```

### 4. إنشاء Route Index

```javascript
// routes/index.js
const express = require('express');
const router = express.Router();

// Import all route modules
const ticketRoutes = require('./ticketRoutes');
const physicianRoutes = require('./physicianDashboardRoutes');
// ... etc

// Mount routes
router.use('/tickets', ticketRoutes);
router.use('/physician-dashboard', physicianRoutes);
// ... etc

module.exports = router;
```

## ⚠️ ملاحظات هامة

1. **النسخ الاحتياطي**: قم بعمل نسخة احتياطية قبل البدء
2. **الاختبار**: اختبر كل صفحة بعد نقلها
3. **المراجع**: تأكد من تحديث جميع المراجع
4. **الخادم**: قد تحتاج لإعادة تشغيل الخادم

