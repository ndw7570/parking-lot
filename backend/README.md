hr/
├── backend/
│   ├── manage.py
│   ├── core/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── local.py
│   │   │   └── prod.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   ├── wsgi.py
│   │   ├── pagination.py
│   │   └── ...
│   │
│   └── hr/
│       ├── common/
│       └── employee/
│           ├── migrations/
│           ├── models/
│           ├── views/
│           ├── serializers/
│           └── ...
│
├── frontend/
│   ├── templates/
│   │   ├── base.html
│   │   ├── layout/
│   │   │   ├── header.html
│   │   │   ├── sidebar.html
│   │   │   ├── breadcrumb.html
│   │   │   └── messages.html
│   │   │
│   │   ├── components/
│   │   │   ├── table/
│   │   │   │   ├── table.html
│   │   │   │   ├── pagination.html
│   │   │   │   └── empty.html
│   │   │   ├── form/
│   │   │   │   ├── field.html
│   │   │   │   ├── errors.html
│   │   │   │   └── actions.html
│   │   │   ├── modal/
│   │   │   │   └── modal.html
│   │   │   └── search/
│   │   │       └── search_form.html
│   │   │
│   │   ├── pages/
│   │   │   ├── home/
│   │   │   │   └── index.html
│   │   │   ├── hr/
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── index.html
│   │   │   │   ├── employee/
│   │   │   │   │   ├── list.html
│   │   │   │   │   ├── detail.html
│   │   │   │   │   ├── form.html
│   │   │   │   │   └── partials/
│   │   │   │   │       ├── table.html
│   │   │   │   │       ├── row.html
│   │   │   │   │       └── form_body.html
│   │   │   │   └── department/
│   │   │   │       ├── list.html
│   │   │   │       └── partials/
│   │   │   │           └── table.html
│   │   │   └── common/
│   │   │       ├── 403.html
│   │   │       ├── 404.html
│   │   │       └── 500.html
│   │   │
│   │   └── fragments/
│   │       ├── htmx_success.html
│   │       ├── htmx_error.html
│   │       └── toast.html
│   │
│   ├── static/
│   │   ├── css/
│   │   │   ├── app.css
│   │   │   ├── layout.css
│   │   │   ├── components.css
│   │   │   └── pages/
│   │   │       ├── hr-dashboard.css
│   │   │       └── employee-list.css
│   │   │
│   │   ├── js/
│   │   │   ├── app.js
│   │   │   ├── htmx.js
│   │   │   ├── alpine-init.js
│   │   │   └── pages/
│   │   │       ├── employee-list.js
│   │   │       └── employee-form.js
│   │   │
│   │   ├── images/
│   │   └── vendors/
│   │
│   └── docs/
│       ├── screen-map.md
│       ├── template-rules.md
│       └── naming-conventions.md
│
└── README.md