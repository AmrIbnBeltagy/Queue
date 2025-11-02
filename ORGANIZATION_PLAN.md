# خطة تنظيم المشروع الاحترافية

## 📋 المهام

### المرحلة 1: تنظيم Backend
- [x] إنشاء مجلدات controllers, services, middleware, validators
- [ ] نقل logic من routes إلى controllers
- [ ] إنشاء services للـ business logic
- [ ] إنشاء middleware مشترك (auth, validation, error handling)
- [ ] تنظيم routes في ملف index.js مركزي

### المرحلة 2: تنظيم Frontend
- [x] إنشاء مجلدات pages, scripts, styles, assets
- [ ] نقل HTML pages إلى public/pages/
- [ ] نقل JavaScript files إلى public/scripts/
  - [ ] صفحات منفصلة في scripts/pages/
  - [ ] services في scripts/services/
  - [ ] components في scripts/components/
  - [ ] utils في scripts/utils/
- [ ] نقل CSS إلى public/styles/
- [ ] نقل الصور والملفات الثابتة إلى public/assets/

### المرحلة 3: Configuration
- [ ] فصل configuration files
- [ ] إنشاء config/constants.js
- [ ] إنشاء config/routes.js
- [ ] تحسين config.env structure

### المرحلة 4: Documentation
- [x] إنشاء README.md محسّن
- [x] إنشاء PROJECT_STRUCTURE.md
- [ ] إنشاء API documentation
- [ ] إنشاء coding standards document

### المرحلة 5: Code Quality
- [ ] إضافة ESLint configuration
- [ ] إضافة Prettier configuration
- [ ] إضافة .editorconfig
- [ ] تحسين error handling

## 📁 البنية المقترحة

```
QueueProject/
├── config/
│   ├── database.js
│   ├── app.js
│   └── constants.js
├── controllers/
│   ├── ticketController.js
│   ├── physicianController.js
│   └── ...
├── services/
│   ├── ticketService.js
│   ├── physicianService.js
│   └── ...
├── middleware/
│   ├── auth.js
│   ├── validation.js
│   └── errorHandler.js
├── validators/
│   ├── ticketValidator.js
│   └── ...
├── models/
├── routes/
│   ├── index.js
│   └── ...
├── public/
│   ├── pages/
│   ├── scripts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── components/
│   │   └── utils/
│   ├── styles/
│   └── assets/
└── server.js
```

