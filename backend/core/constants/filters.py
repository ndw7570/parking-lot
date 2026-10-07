EXCLUDE_FROM_STRICT_CHECK = {
    'page',
    'no_page',
    'page_size',
    'ordering',
    'cursor',
    'soft_delete_mode',
    'year',
    'month',

    # 공통 아님
    'summary'
    'dup_check',
    'create',
    'mode',
    'code'
    # 'restore'
}

VEHICLE_FILTER_FIELDS = {
    'plate_number': 'plate_number__exact',
    'parking_type!': 'plate_number__exact',
}








EXISTENCE_FILTER_FIELDS = {
    'is_null_company_email': 'company_email__isnull',
}

DEPARTMENT_FILTER_FIELDS = {
    'dept_name': 'dept_name__icontains',
}

STAFF_FILTER_FIELDS = {
    'staff_name': 'staff_name__icontains',
}

DEPT_LEVLE1_FILTER_FIELDS = {
    'dept1_name': 'dept1_name__icontains',
}

DEPT_LEVLE_ALL_FILTER_FIELDS = {
    'dept1_name': 'dept1_name__icontains',
    'dept2_name': 'dept2_name__icontains',
    'dept3_name': 'dept3_name__icontains',
}

EMPLOYEE_FILTER_FIELDS = {
    'employee_id': 'employee_id__in',
    'employee_name': 'employee_name__icontains',
    'search_text': {
        'employee_name': 'employee_name__icontains',
        'employee_code': 'employee_code__icontains',
        'company_email': 'company_email__icontains',
    },
    'employment_status': 'employment_status__exact',
    'company_email': 'company_email__icontains',
    'dept1_id': 'dept3__dept2__dept1_id__exact',
    'dept2_id': 'dept3__dept2_id__exact',
    'dept3_id': 'dept3_id__exact',
}

APPOINTMENT_FILTER_FIELDS = {
    # 'employee_name': 'employee__employee_name__icontains',
    # 'appointment_contents': 'appointment_contents__icontains',
    # 'employment_status': 'employee__employment_status__exact',
    'appointment_type': 'appointment_type__exact',
    'appointment_status': 'appointment_status__exact',
    'appointment_contents': 'appointment_contents__icontains',
    'employee_name': 'employee__employee_name__icontains',
}

GOVERNMENT_PROJECT_FILTER_FIELDS = {
    # 'summary': 'summary',
    'employee_name': 'employee_name__icontains',
}