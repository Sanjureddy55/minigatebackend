import os, django
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.development'
django.setup()
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.accounts.models import City
from apps.platform_admin.audit_logs.models import AuditLog
from apps.society_admin.audit_logs.models import SocietyAuditLog

User = get_user_model()
u = User.objects.filter(is_superuser=True).first()
c = APIClient()
c.force_authenticate(user=u)

ok = lambda label, cond: print(f'  [OK]   {label}') if cond else print(f'  [FAIL] {label}')

print('=== AUDIT LOG CHAIN ===')
city = City.objects.first()
before = AuditLog.objects.count()
r = c.post('/api/platform-admin/society-management/', {'name':'ChainSoc','city':city.pk,'total_flats':5,'plan':'free','admin_email':'chain2@test.com'}, format='json')
ok('Society Create -> Platform AuditLog', AuditLog.objects.count() > before)
if r.status_code == 201:
    sid = r.json()['data']['id']
    before2 = AuditLog.objects.count()
    c.post(f'/api/platform-admin/society-management/{sid}/approve/')
    ok('Society Approve -> Platform AuditLog', AuditLog.objects.count() > before2)
    before3 = AuditLog.objects.count()
    c.post(f'/api/platform-admin/society-management/{sid}/suspend/')
    ok('Society Suspend -> Platform AuditLog', AuditLog.objects.count() > before3)
    from apps.platform_admin.create_society.models import Society
    Society.objects.filter(pk=sid).delete()

print()
print('=== ALL ENDPOINTS ===')
urls = [
    ('/api/platform-admin/dashboard/stats/', 'PA Dashboard Stats'),
    ('/api/platform-admin/society-management/stats/', 'PA Society Mgmt Stats'),
    ('/api/platform-admin/society-management/', 'PA Society Mgmt List'),
    ('/api/platform-admin/subscription-plans/', 'PA Subscription Plans'),
    ('/api/platform-admin/subscription-plans/stats/', 'PA Plan Stats'),
    ('/api/platform-admin/global-users/', 'PA Global Users'),
    ('/api/platform-admin/global-users/stats/', 'PA User Stats'),
    ('/api/platform-admin/audit-logs/', 'PA Audit Logs'),
    ('/api/platform-admin/audit-logs/export/', 'PA Audit Export'),
    ('/api/platform-admin/global-reports/overview/', 'PA Report Overview'),
    ('/api/platform-admin/global-reports/society-growth/', 'PA Report Society'),
    ('/api/platform-admin/global-reports/user-growth/', 'PA Report Users'),
    ('/api/platform-admin/global-reports/revenue/', 'PA Report Revenue'),
    ('/api/platform-admin/global-reports/complaints/', 'PA Report Complaints'),
    ('/api/platform-admin/global-reports/visitors/', 'PA Report Visitors'),
    ('/api/society-admin/dashboard/?society=11', 'SA Dashboard'),
    ('/api/society-admin/buildings/?society=11', 'SA Buildings'),
    ('/api/society-admin/flats/?society=11', 'SA Flats'),
    ('/api/society-admin/visitors/?society=11', 'SA Visitors'),
    ('/api/society-admin/approvals/?society=11', 'SA Approvals'),
    ('/api/society-admin/approvals/kpi/?society=11', 'SA Approval KPI'),
    ('/api/society-admin/complaints/?society=11', 'SA Complaints'),
    ('/api/society-admin/complaints/stats/?society=11', 'SA Complaint Stats'),
    ('/api/society-admin/payments/overview/?society=11', 'SA Payments'),
    ('/api/society-admin/maintenance-expenses/?society=11', 'SA Expenses'),
    ('/api/society-admin/maintenance-expenses/summary/?society=11', 'SA Expense Summary'),
    ('/api/society-admin/fund-dashboard/?society=11', 'SA Fund Dashboard'),
    ('/api/society-admin/monthly-statements/?society=11', 'SA Monthly Statements'),
    ('/api/society-admin/monthly-statements/1/download-pdf/', 'SA PDF Download'),
    ('/api/society-admin/monthly-statements/1/export-excel/', 'SA Excel Export'),
    ('/api/society-admin/audit-logs/?society=11', 'SA Audit Logs'),
    ('/api/society-admin/audit-logs/export/?society=11', 'SA Audit Export'),
    ('/api/society-admin/analytics/?society=11', 'SA Analytics'),
    ('/api/society-admin/notice-board/?society=11', 'SA Notice Board'),
    ('/api/society-admin/residents/?society=11', 'SA Residents'),
    ('/api/resident/complaints/', 'Resident Complaints'),
    ('/api/resident/payments/', 'Resident Payments'),
    ('/api/resident/notices/', 'Resident Notices'),
    ('/api/resident/visitors/', 'Resident Visitors'),
    ('/api/resident/profile/', 'Resident Profile'),
]
for url, label in urls:
    r = c.get(url)
    ok(label, r.status_code == 200)
