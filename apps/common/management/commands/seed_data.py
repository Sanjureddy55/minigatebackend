"""
Management command: seed_data
Creates a complete set of test data for all roles and modules.

Usage:
    python manage.py seed_data --settings=config.settings.development
    python manage.py seed_data --clear   # wipe first, then seed

Accounts created:
    superadmin@minigate.in   / password: Admin@123   (Django superuser + Platform Admin profile)
    societyadmin@minigate.in / password: Admin@123   (Society Admin)
    resident1@minigate.in    / password: Admin@123   (Resident – A-101, Tower A)
    resident2@minigate.in    / password: Admin@123   (Resident – B-201, Tower B)
    guard1@minigate.in       / password: Admin@123   (Security Guard profile only)
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

User = get_user_model()


class Command(BaseCommand):
    help = "Seed the database with test data for all society admin features."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear", action="store_true",
            help="Clear ALL existing data before seeding (dangerous in production).",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self._clear()

        self.stdout.write(self.style.WARNING("-- Seeding MiniGate test data --"))

        society  = self._seed_society()
        sa_profile = self._seed_users(society)
        tower_a, tower_b = self._seed_buildings(society)
        flats    = self._seed_flats(tower_a, tower_b, society)
        profiles = self._seed_residents(society, flats)
        self._seed_staff(society)
        self._seed_gates(society)
        self._seed_vendors(society)
        self._seed_notices(society, sa_profile)
        self._seed_maintenance_dues(society, flats)
        self._seed_visitors(society, flats)
        self._seed_approvals(society, profiles)
        self._seed_complaints(society, flats, profiles)
        self._seed_security_alerts(society)
        self._seed_maintenance_expenses(society, sa_profile)
        self._seed_platform_tickets(society)
        self._seed_platform_payments(society)
        self._seed_monthly_statement(society)
        self._seed_audit_logs(society)

        self.stdout.write(self.style.SUCCESS("\nSeed complete. All APIs are ready to test.\n"))
        self._print_accounts()

    # ──────────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────────

    def _make_user(self, email, full_name, mobile, password="Admin@123"):
        user, created = User.objects.get_or_create(
            username=email, defaults={"email": email, "first_name": full_name.split()[0]}
        )
        if created:
            user.set_password(password)
            user.save()
        return user, created

    def _log(self, msg):
        self.stdout.write(f"  {msg}")

    # ──────────────────────────────────────────────────────────────────────────
    # Clear
    # ──────────────────────────────────────────────────────────────────────────

    def _clear(self):
        from apps.resident.complaints.models import Complaint
        from apps.resident.payments.models import MaintenanceDue, ResidentPayment
        from apps.society_admin.approvals.models import ApprovalRequest
        from apps.society_admin.security.models import Gate, SecurityAlert
        from apps.society_admin.staff_guards.models import StaffMember
        from apps.society_admin.vendors.models import Vendor
        from apps.society_admin.visitors.models import Visitor
        from apps.society_admin.notice_board.models import Notice, NoticeRead

        from apps.society_admin.maintenance_expenses.models import MaintenanceExpense
        from apps.society_admin.monthly_statements.models import MonthlyStatement
        from apps.platform_admin.dashboard.models import SupportTicket, PlatformPayment
        from apps.platform_admin.audit_logs.models import AuditLog
        from apps.society_admin.audit_logs.models import SocietyAuditLog

        for Model in [
            NoticeRead, Notice, Complaint, ResidentPayment, MaintenanceDue,
            ApprovalRequest, Visitor, SecurityAlert, Gate, StaffMember, Vendor,
            MaintenanceExpense, MonthlyStatement, SupportTicket, PlatformPayment,
            AuditLog, SocietyAuditLog,
        ]:
            count = Model.objects.count()
            Model.objects.all().delete()
            self._log(f"Cleared {count} {Model.__name__} records")

        self.stdout.write(self.style.WARNING("  Cleared existing test data.\n"))

    # ──────────────────────────────────────────────────────────────────────────
    # Society
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_society(self):
        from apps.accounts.models import City, Country
        from apps.platform_admin.create_society.models import Society

        country, _ = Country.objects.get_or_create(name="India", defaults={"code": "IN"})
        city, _    = City.objects.get_or_create(
            name="Bengaluru",
            defaults={"country": country, "state": "Karnataka"},
        )
        society, created = Society.objects.get_or_create(
            name="Greenwood Heights",
            defaults={
                "city":        city,
                "total_flats": 348,
                "plan":        Society.Plan.PRO,
                "status":      Society.Status.ACTIVE,
                "admin_email": "societyadmin@minigate.in",
            },
        )
        self._log(f"{'Created' if created else 'Found'} society: {society.name} (id={society.pk})")
        return society

    # ──────────────────────────────────────────────────────────────────────────
    # Users & Profiles
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_users(self, society):
        from apps.roles_permissions.models import Module, ModulePermission, Role, RoleType, UserProfile

        # ── Super Admin role (full access) ──────────────────────────────────
        su_role, su_role_created = Role.objects.get_or_create(
            slug="super-admin",
            defaults={
                "name":        "Super Admin",
                "role_type":   RoleType.ADMIN,
                "system_role": True,
                "description": "Full platform access",
            },
        )
        if su_role_created:
            for module_value, _ in Module.choices:
                ModulePermission.objects.get_or_create(
                    role=su_role, module=module_value,
                    defaults={"can_view": True, "can_create": True, "can_edit": True, "can_delete": True},
                )

        su_user, created = self._make_user("superadmin@minigate.in", "Super Admin", "9000000001")
        if created:
            su_user.is_staff = su_user.is_superuser = True
            su_user.save()
        su_profile, _ = UserProfile.objects.get_or_create(
            user=su_user,
            defaults={
                "full_name": "Super Admin",
                "mobile":    "9000000001",
                "role":      su_role,
                "status":    UserProfile.Status.ACTIVE,
            },
        )
        # Ensure role is set even if profile already existed
        if su_profile.role_id != su_role.pk:
            su_profile.role = su_role
            su_profile.save(update_fields=["role"])
        self._log(f"Superadmin: {su_user.username}  role={su_role.name}")

        # ── Society Admin role ───────────────────────────────────────────────
        SA_MODULES = [
            Module.RESIDENTS, Module.VISITORS, Module.APPROVALS, Module.BILLING,
            Module.COMPLAINTS, Module.NOTICES, Module.PAYMENTS, Module.STAFF,
            Module.VENDORS, Module.ANALYTICS, Module.AUDIT_LOGS, Module.REPORTS,
            Module.SECURITY_ALERTS, Module.SETTINGS,
        ]
        sa_role, sa_role_created = Role.objects.get_or_create(
            slug="society-admin",
            defaults={
                "name":        "Society Admin",
                "role_type":   RoleType.ADMIN,
                "system_role": True,
            },
        )
        if sa_role_created:
            for module_value in SA_MODULES:
                ModulePermission.objects.get_or_create(
                    role=sa_role, module=module_value,
                    defaults={"can_view": True, "can_create": True, "can_edit": True, "can_delete": True},
                )
        else:
            # Ensure permissions exist even if role was pre-existing
            for module_value in SA_MODULES:
                ModulePermission.objects.get_or_create(
                    role=sa_role, module=module_value,
                    defaults={"can_view": True, "can_create": True, "can_edit": True, "can_delete": True},
                )
        sa_user, _ = self._make_user("societyadmin@minigate.in", "Priya Sharma", "9000000002")
        sa_profile, _ = UserProfile.objects.get_or_create(
            user=sa_user,
            defaults={
                "full_name": "Priya Sharma",
                "mobile":    "9000000002",
                "role":      sa_role,
                "society":   society,
                "status":    UserProfile.Status.ACTIVE,
            },
        )
        # Link society to this admin
        from apps.platform_admin.create_society.models import Society
        Society.objects.filter(pk=society.pk).update(society_admin=sa_user)

        self._log(f"Society Admin: {sa_user.username}")
        return sa_profile

    # ──────────────────────────────────────────────────────────────────────────
    # Buildings & Flats
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_buildings(self, society):
        from apps.society_admin.buildings.models import Building

        tower_a, _ = Building.objects.get_or_create(society=society, name="Tower A")
        tower_b, _ = Building.objects.get_or_create(society=society, name="Tower B")
        self._log(f"Buildings: Tower A (id={tower_a.pk}), Tower B (id={tower_b.pk})")
        return tower_a, tower_b

    def _seed_flats(self, tower_a, tower_b, society):
        from apps.society_admin.flats.models import Flat

        flats = []
        flat_defs = [
            (tower_a, "A-101"), (tower_a, "A-102"), (tower_a, "A-201"),
            (tower_b, "B-101"), (tower_b, "B-201"), (tower_b, "B-202"),
        ]
        for building, flat_number in flat_defs:
            flat, _ = Flat.objects.get_or_create(building=building, flat_number=flat_number)
            flats.append(flat)

        self._log(f"Flats: {[f.flat_number for f in flats]}")
        return flats

    # ──────────────────────────────────────────────────────────────────────────
    # Residents
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_residents(self, society, flats):
        from apps.roles_permissions.models import Module, ModulePermission, Role, RoleType, UserProfile

        RES_MODULES = [
            (Module.COMPLAINTS, True, True, False, False),
            (Module.PAYMENTS,   True, False, False, False),
            (Module.NOTICES,    True, False, False, False),
            (Module.VISITORS,   True, True, False, False),
        ]
        res_role, created = Role.objects.get_or_create(
            slug="resident",
            defaults={"name": "Resident", "role_type": RoleType.RESIDENT, "system_role": True},
        )
        for module_value, view, create, edit, delete in RES_MODULES:
            ModulePermission.objects.get_or_create(
                role=res_role, module=module_value,
                defaults={"can_view": view, "can_create": create, "can_edit": edit, "can_delete": delete},
            )

        resident_defs = [
            ("resident1@minigate.in", "Aarav Sharma",  "9100000001", flats[0]),
            ("resident2@minigate.in", "Diya Patel",    "9100000002", flats[3]),
            ("resident3@minigate.in", "Kabir Mehta",   "9100000003", flats[4]),
        ]
        profiles = []
        for email, name, mobile, flat in resident_defs:
            user, _ = self._make_user(email, name, mobile)
            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "full_name":  name,
                    "mobile":     mobile,
                    "role":       res_role,
                    "society":    society,
                    "flat_number": flat.flat_number,
                    "status":     UserProfile.Status.ACTIVE,
                },
            )
            profiles.append(profile)
            self._log(f"Resident: {email}  flat={flat.flat_number}")
        return profiles

    # ──────────────────────────────────────────────────────────────────────────
    # Staff & Guards
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_staff(self, society):
        from apps.society_admin.staff_guards.models import StaffMember
        import datetime

        staff_defs = [
            ("Suresh Kumar",   StaffMember.Role.SECURITY_GUARD, StaffMember.Shift.NIGHT,   "Gate 1 (Main)"),
            ("Ramesh Patil",   StaffMember.Role.SECURITY_GUARD, StaffMember.Shift.MORNING,  "Gate 2 (Service)"),
            ("Manoj Singh",    StaffMember.Role.SECURITY_GUARD, StaffMember.Shift.DAY,      "Gate 1 (Main)"),
            ("Lakshmi Devi",   StaffMember.Role.HOUSEKEEPING,   StaffMember.Shift.MORNING,  ""),
            ("Pradeep Kumar",  StaffMember.Role.HOUSEKEEPING,   StaffMember.Shift.DAY,      ""),
            ("Anand Rao",      StaffMember.Role.MAINTENANCE,    StaffMember.Shift.DAY,      ""),
            ("Vinod Kumar",    StaffMember.Role.GARDENER,       StaffMember.Shift.MORNING,  ""),
        ]
        created = 0
        for name, role, shift, gate in staff_defs:
            obj, was_created = StaffMember.objects.get_or_create(
                society=society, full_name=name,
                defaults={
                    "role":          role,
                    "shift":         shift,
                    "status":        StaffMember.Status.ACTIVE,
                    "phone":         f"98000{created:05d}",
                    "gate_assigned": gate,
                    "joined_date":   datetime.date(2024, 1, 15),
                },
            )
            if was_created:
                created += 1
        self._log(f"Staff created: {created} members (guards/housekeeping/maintenance/gardener)")

    # ──────────────────────────────────────────────────────────────────────────
    # Gates
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_gates(self, society):
        from apps.society_admin.security.models import Gate

        gates_def = [
            ("Gate 1 (Main)",    Gate.Status.OPEN),
            ("Gate 2 (Service)", Gate.Status.OPEN),
            ("Gate 3 (Exit)",    Gate.Status.CLOSED),
        ]
        created = 0
        for name, status in gates_def:
            _, was_created = Gate.objects.get_or_create(
                society=society, name=name, defaults={"status": status}
            )
            if was_created:
                created += 1
        self._log(f"Gates created: {created} (2 open, 1 closed)")

    # ──────────────────────────────────────────────────────────────────────────
    # Vendors
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_vendors(self, society):
        from apps.society_admin.vendors.models import Vendor
        import datetime

        vendor_defs = [
            ("AquaPure",         Vendor.Category.WATER_TANKER,  "+91 9876543210", Vendor.Status.ACTIVE),
            ("GreenScape",       Vendor.Category.LANDSCAPING,   "+91 9123456780", Vendor.Status.ACTIVE),
            ("FixIt Plumbing",   Vendor.Category.PLUMBING,      "+91 9988776655", Vendor.Status.PENDING_RENEWAL),
            ("CleanPro",         Vendor.Category.CLEANING,      "+91 9871234560", Vendor.Status.ACTIVE),
            ("LiftTech",         Vendor.Category.LIFT,          "+91 9012345678", Vendor.Status.ACTIVE),
        ]
        created = 0
        for name, cat, phone, status in vendor_defs:
            _, was_created = Vendor.objects.get_or_create(
                society=society, name=name,
                defaults={
                    "category":        cat,
                    "contact_phone":   phone,
                    "status":          status,
                    "contract_start":  datetime.date(2025, 1, 1),
                    "contract_end":    datetime.date(2026, 12, 31),
                },
            )
            if was_created:
                created += 1
        self._log(f"Vendors created: {created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Notices
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_notices(self, society, created_by):
        from apps.society_admin.notice_board.models import Notice
        import datetime

        notice_defs = [
            {
                "title":       "Water tanker schedule revised",
                "description": "Tankers will now arrive at 7 AM and 5 PM daily until further notice.",
                "category":    Notice.Category.NOTICE,
                "status":      Notice.Status.ACTIVE,
            },
            {
                "title":       "Vinayaka Chavithi celebrations",
                "description": "Join us for the Ganesh Chaturthi puja at the community hall on 7th Sept.",
                "category":    Notice.Category.FUNDRAISER,
                "status":      Notice.Status.ACTIVE,
                "event_date":  datetime.date(2026, 9, 7),
                "target_amount":       75000,
                "contribution_per_flat": 500,
                "raised_amount":       22500,
            },
            {
                "title":       "Lift maintenance — Block A",
                "description": "Lift in Tower A will be under maintenance on 25 May 06:00–12:00.",
                "category":    Notice.Category.MAINTENANCE,
                "status":      Notice.Status.ACTIVE,
                "event_date":  datetime.date(2026, 5, 25),
            },
        ]
        created = 0
        for nd in notice_defs:
            _, was_created = Notice.objects.get_or_create(
                society=society, title=nd["title"],
                defaults={"created_by": created_by, "audience": Notice.Audience.ALL, **nd},
            )
            if was_created:
                created += 1
        self._log(f"Notices created: {created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Maintenance Dues
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_maintenance_dues(self, society, flats):
        from apps.resident.payments.models import MaintenanceDue
        import datetime

        today  = timezone.localdate()
        month  = today.replace(day=1)
        due_date = month.replace(day=5)

        created = 0
        status_cycle = [
            MaintenanceDue.Status.PAID,
            MaintenanceDue.Status.PENDING,
            MaintenanceDue.Status.OVERDUE,
            MaintenanceDue.Status.PAID,
            MaintenanceDue.Status.PENDING,
            MaintenanceDue.Status.OVERDUE,
        ]
        amounts = [12500, 14200, 11800, 13000, 15000, 12000]
        for i, flat in enumerate(flats):
            _, was_created = MaintenanceDue.objects.get_or_create(
                flat=flat, month=month,
                defaults={
                    "society":  society,
                    "amount":   amounts[i],
                    "due_date": due_date,
                    "status":   status_cycle[i],
                },
            )
            if was_created:
                created += 1
        self._log(f"Maintenance dues created: {created} (for current month)")

    # ──────────────────────────────────────────────────────────────────────────
    # Visitors
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_visitors(self, society, flats):
        from apps.society_admin.visitors.models import Visitor

        now  = timezone.now()
        defs = [
            ("Myra Joshi",     "+91 9371342592", Visitor.VisitType.GUEST,     flats[0], Visitor.Status.INSIDE,    now),
            ("Arjun Reddy",    "+91 9667411264", Visitor.VisitType.DELIVERY,  flats[3], Visitor.Status.PENDING,   None),
            ("Sai Rao",        "+91 9316026234", Visitor.VisitType.SERVICE,   flats[2], Visitor.Status.INSIDE,    now),
            ("Aditya Nair",    "+91 9505489968", Visitor.VisitType.GUEST,     flats[1], Visitor.Status.PENDING,   None),
            ("Kabir Verma",    "+91 9871234560", Visitor.VisitType.SERVICE,   flats[4], Visitor.Status.APPROVED,  None),
            ("Reyansh Sharma", "+91 9316026235", Visitor.VisitType.GUEST,     flats[5], Visitor.Status.EXITED,    now),
        ]
        created = 0
        for name, mobile, vtype, flat, vstatus, checkin in defs:
            obj, was_created = Visitor.objects.get_or_create(
                society=society, full_name=name, mobile=mobile,
                defaults={
                    "flat":           flat,
                    "host_name":      flat.flat_number,
                    "visit_type":     vtype,
                    "status":         vstatus,
                    "checked_in_at":  checkin,
                    "vehicle_number": "",
                    "purpose":        "Personal visit",
                },
            )
            if was_created:
                created += 1
        self._log(f"Visitors created: {created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Approval Requests
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_approvals(self, society, profiles):
        from apps.society_admin.approvals.models import ApprovalRequest

        defs = [
            ("New Tenant Onboarding", ApprovalRequest.Category.MOVE_IN,     ApprovalRequest.Priority.LOW,    ApprovalRequest.Status.REJECTED,  ApprovalRequest.Stage.SUBMITTED,    25),
            ("Vehicle Registration",  ApprovalRequest.Category.VISITOR,     ApprovalRequest.Priority.HIGH,   ApprovalRequest.Status.APPROVED,  ApprovalRequest.Stage.APPROVED,    100),
            ("Pet Registration",      ApprovalRequest.Category.OTHER,       ApprovalRequest.Priority.MEDIUM, ApprovalRequest.Status.REJECTED,  ApprovalRequest.Stage.APPROVED,     80),
            ("Move-in Request",       ApprovalRequest.Category.MOVE_IN,     ApprovalRequest.Priority.MEDIUM, ApprovalRequest.Status.REJECTED,  ApprovalRequest.Stage.SUBMITTED,    10),
            ("Renovation Approval",   ApprovalRequest.Category.MAINTENANCE, ApprovalRequest.Priority.HIGH,   ApprovalRequest.Status.PENDING,   ApprovalRequest.Stage.UNDER_REVIEW, 40),
            ("Domestic Help Verify",  ApprovalRequest.Category.OTHER,       ApprovalRequest.Priority.HIGH,   ApprovalRequest.Status.PENDING,   ApprovalRequest.Stage.SUBMITTED,    5),
        ]
        created = 0
        for i, (title, cat, pri, stat, stage, prog) in enumerate(defs):
            req = profiles[i % len(profiles)]
            _, was_created = ApprovalRequest.objects.get_or_create(
                society=society, title=title,
                defaults={
                    "category":    cat,
                    "priority":    pri,
                    "status":      stat,
                    "stage":       stage,
                    "progress":    prog,
                    "requester":   req,
                    "description": f"Request for {title}",
                },
            )
            if was_created:
                created += 1
        self._log(f"Approval requests created: {created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Complaints
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_complaints(self, society, flats, profiles):
        from apps.resident.complaints.models import Complaint

        defs = [
            ("Water leakage in bathroom", Complaint.Category.MAINTENANCE, Complaint.Priority.HIGH,   Complaint.Status.IN_PROGRESS, flats[0], profiles[0]),
            ("Lift not working",          Complaint.Category.MAINTENANCE, Complaint.Priority.HIGH,   Complaint.Status.OPEN,        flats[3], profiles[1]),
            ("Garden lights flickering",  Complaint.Category.AMENITIES,   Complaint.Priority.LOW,    Complaint.Status.RESOLVED,    flats[4], profiles[2]),
            ("Noisy neighbours",          Complaint.Category.NOISE,       Complaint.Priority.MEDIUM, Complaint.Status.OPEN,        flats[1], profiles[0]),
            ("Parking violation",         Complaint.Category.PARKING,     Complaint.Priority.MEDIUM, Complaint.Status.IN_PROGRESS, flats[2], profiles[1]),
        ]
        created = 0
        for title, cat, pri, stat, flat, resident in defs:
            obj, was_created = Complaint.objects.get_or_create(
                society=society, title=title,
                defaults={
                    "flat":        flat,
                    "resident":    resident,
                    "category":    cat,
                    "priority":    pri,
                    "status":      stat,
                    "description": f"Complaint: {title}",
                    "resolved_at": timezone.now() if stat == Complaint.Status.RESOLVED else None,
                },
            )
            if was_created:
                created += 1
        self._log(f"Complaints created: {created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Security Alerts
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_security_alerts(self, society):
        from apps.society_admin.security.models import SecurityAlert

        defs = [
            (SecurityAlert.AlertType.UNAUTHORIZED_VEHICLE, "Unauthorized vehicle KA-05-AB-1234 attempted entry", "Gate 2"),
            (SecurityAlert.AlertType.TAILGATING,           "Tailgating detected at main entrance",               "Gate 1"),
            (SecurityAlert.AlertType.CAMERA_OFFLINE,       "Camera offline — Tower B lobby",                     ""),
        ]
        created = 0
        for alert_type, desc, gate in defs:
            _, was_created = SecurityAlert.objects.get_or_create(
                society=society, alert_type=alert_type, gate=gate,
                defaults={"description": desc, "status": SecurityAlert.Status.ACTIVE},
            )
            if was_created:
                created += 1
        self._log(f"Security alerts created: {created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Maintenance Expenses
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_maintenance_expenses(self, society, created_by):
        from apps.society_admin.maintenance_expenses.models import MaintenanceExpense
        import datetime

        today = timezone.localdate()
        defs = [
            ("Security Guard Salaries – May", MaintenanceExpense.Category.SECURITY,     45000, "SecureFirst Agency",  datetime.date(today.year, today.month, 1),  True),
            ("Water Tanker Supply",           MaintenanceExpense.Category.WATER,         12000, "AquaPure",            datetime.date(today.year, today.month, 5),  True),
            ("Lift AMC – Tower A",            MaintenanceExpense.Category.LIFT,          18000, "LiftTech",            datetime.date(today.year, today.month, 8),  True),
            ("Garden Maintenance",            MaintenanceExpense.Category.GARDENING,      8500, "GreenScape",          datetime.date(today.year, today.month, 10), True),
            ("Common Electricity Bill",       MaintenanceExpense.Category.ELECTRICITY,   22000, "BESCOM",              datetime.date(today.year, today.month, 12), True),
            ("Plumbing Repairs – B Block",    MaintenanceExpense.Category.REPAIRS,        6500, "FixIt Plumbing",      datetime.date(today.year, today.month, 15), False),
            ("Housekeeping Supplies",         MaintenanceExpense.Category.HOUSEKEEPING,   4200, "CleanPro",            datetime.date(today.year, today.month, 18), False),
        ]
        created = 0
        for title, cat, amount, vendor, exp_date, published in defs:
            _, was_created = MaintenanceExpense.objects.get_or_create(
                society=society, title=title,
                defaults={
                    "category":     cat,
                    "amount":       amount,
                    "vendor_name":  vendor,
                    "expense_date": exp_date,
                    "is_published": published,
                    "created_by":   created_by,
                    "notes":        f"Recorded by society admin for {exp_date.strftime('%B %Y')}",
                },
            )
            if was_created:
                created += 1
        self._log(f"Maintenance expenses created: {created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Platform Support Tickets
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_platform_tickets(self, society):
        from apps.platform_admin.dashboard.models import SupportTicket

        defs = [
            ("Login OTP not received",             SupportTicket.Category.TECHNICAL,       SupportTicket.Status.OPEN),
            ("Subscription renewal failed",         SupportTicket.Category.BILLING,         SupportTicket.Status.IN_PROGRESS),
            ("Add bulk flat import feature",        SupportTicket.Category.FEATURE_REQUEST, SupportTicket.Status.OPEN),
            ("Society admin locked out",            SupportTicket.Category.ACCOUNT,         SupportTicket.Status.RESOLVED),
            ("PDF download not working on iOS",     SupportTicket.Category.TECHNICAL,       SupportTicket.Status.IN_PROGRESS),
            ("Request: WhatsApp notification integration", SupportTicket.Category.FEATURE_REQUEST, SupportTicket.Status.OPEN),
        ]
        created = 0
        for title, cat, stat in defs:
            _, was_created = SupportTicket.objects.get_or_create(
                society=society, title=title,
                defaults={
                    "category":    cat,
                    "status":      stat,
                    "description": f"Support request: {title}",
                },
            )
            if was_created:
                created += 1
        self._log(f"Platform support tickets created: {created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Platform Payments
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_platform_payments(self, society):
        from apps.platform_admin.dashboard.models import PlatformPayment
        import datetime

        today = timezone.localdate()
        defs = [
            (PlatformPayment.PaymentType.SUBSCRIPTION, 4999,  PlatformPayment.Status.PAID,    datetime.date(today.year, today.month, 1),  "Pro plan monthly subscription"),
            (PlatformPayment.PaymentType.SETUP_FEE,    9999,  PlatformPayment.Status.PAID,    datetime.date(today.year, today.month, 1),  "One-time platform setup fee"),
            (PlatformPayment.PaymentType.ADDON,        1499,  PlatformPayment.Status.PAID,    datetime.date(today.year, today.month, 5),  "Analytics addon module"),
            (PlatformPayment.PaymentType.SUBSCRIPTION, 4999,  PlatformPayment.Status.PENDING, datetime.date(today.year, today.month+1 if today.month < 12 else 1, 1), "Upcoming renewal"),
        ]
        created = 0
        for ptype, amount, stat, pdate, desc in defs:
            _, was_created = PlatformPayment.objects.get_or_create(
                society=society, payment_type=ptype, payment_date=pdate,
                defaults={
                    "amount":      amount,
                    "status":      stat,
                    "description": desc,
                },
            )
            if was_created:
                created += 1
        self._log(f"Platform payments created: {created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Monthly Statement
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_monthly_statement(self, society):
        from apps.society_admin.monthly_statements.models import MonthlyStatement
        import datetime

        today  = timezone.localdate()
        month  = today.replace(day=1)

        collected = 78500
        expenses  = 116200
        opening   = 85000
        closing   = opening + collected - expenses

        _, was_created = MonthlyStatement.objects.get_or_create(
            society=society, month=month,
            defaults={
                "opening_balance": opening,
                "total_collected": collected,
                "total_expenses":  expenses,
                "closing_balance": closing,
                "is_published":    True,
                "published_at":    timezone.now(),
                "summary":         (
                    f"Statement for {month.strftime('%B %Y')}. "
                    f"Collected ₹{collected:,}, Expenses ₹{expenses:,}, "
                    f"Balance ₹{closing:,}."
                ),
                "notes": "Auto-generated by seed_data command for testing.",
            },
        )
        if was_created:
            self._log(f"Monthly statement created: {month.strftime('%B %Y')} (published)")
        else:
            self._log(f"Monthly statement already exists: {month.strftime('%B %Y')}")

    # ──────────────────────────────────────────────────────────────────────────
    # Audit Log Samples
    # ──────────────────────────────────────────────────────────────────────────

    def _seed_audit_logs(self, society):
        from apps.platform_admin.audit_logs.models import AuditLog
        from apps.society_admin.audit_logs.models import SocietyAuditLog

        plat_created = 0
        plat_defs = [
            ("approved", "approve",  "Greenwood Heights",       "society", str(society.pk)),
            ("updated plan", "update", "Pro → Enterprise",      "plan",    ""),
            ("invited user", "invite", "societyadmin@minigate.in", "user", ""),
            ("suspended society", "suspend", "Old Society",     "society", ""),
            ("created society", "create", society.name,         "society", str(society.pk)),
        ]
        for action, atype, target, ttype, tid in plat_defs:
            if not AuditLog.objects.filter(action=action, target=target).exists():
                AuditLog.objects.create(
                    actor_role="Super Admin", actor_name="Super Admin",
                    action=action, action_type=atype,
                    target=target, target_type=ttype, target_id=tid,
                )
                plat_created += 1

        sa_created = 0
        sa_defs = [
            ("approved visitor",   "approve",  "Myra Joshi → A-101",    "visitor",   ""),
            ("resolved complaint", "resolve",  "Water leakage in bathroom", "complaint", ""),
            ("assigned complaint", "assign",   "Lift not working",      "complaint", ""),
            ("rejected visitor",   "reject",   "Arjun Reddy",           "visitor",   ""),
            ("published statement","publish",  f"{timezone.localdate().strftime('%B %Y')} Statement", "statement", ""),
            ("approved",           "approve",  "Vehicle Registration",  "approval",  ""),
            ("checked in",         "check_in", "Visitor → B-201",       "visitor",   ""),
        ]
        for action, atype, target, ttype, tid in sa_defs:
            if not SocietyAuditLog.objects.filter(society=society, action=action, target=target).exists():
                SocietyAuditLog.objects.create(
                    society=society,
                    actor_role="Society Admin", actor_name="Priya Sharma",
                    action=action, action_type=atype,
                    target=target, target_type=ttype, target_id=tid,
                )
                sa_created += 1

        self._log(f"Platform audit logs created: {plat_created}, Society audit logs: {sa_created}")

    # ──────────────────────────────────────────────────────────────────────────
    # Print summary
    # ──────────────────────────────────────────────────────────────────────────

    def _print_accounts(self):
        self.stdout.write(self.style.SUCCESS("-" * 55))
        self.stdout.write(self.style.SUCCESS("  LOGIN ACCOUNTS (all passwords: Admin@123)"))
        self.stdout.write(self.style.SUCCESS("-" * 55))
        accounts = [
            ("Platform Superadmin", "superadmin@minigate.in"),
            ("Society Admin",       "societyadmin@minigate.in"),
            ("Resident 1 (A-101)",  "resident1@minigate.in"),
            ("Resident 2 (B-101)",  "resident2@minigate.in"),
            ("Resident 3 (B-201)",  "resident3@minigate.in"),
        ]
        for role, email in accounts:
            self.stdout.write(f"  {role:<25} {email}")
        self.stdout.write(self.style.SUCCESS("-" * 55))
        self.stdout.write("")
        self.stdout.write("  Society: Greenwood Heights, Bengaluru")
        self.stdout.write("  Buildings: Tower A (A-101, A-102, A-201)")
        self.stdout.write("             Tower B (B-101, B-201, B-202)")
        self.stdout.write("")
        self.stdout.write("  Test APIs:")
        self.stdout.write("  GET  http://127.0.0.1:8000/api/society-admin/dashboard/?society=1")
        self.stdout.write("  GET  http://127.0.0.1:8000/api/society-admin/complaints/stats/?society=1")
        self.stdout.write("  GET  http://127.0.0.1:8000/api/society-admin/complaints/?society=1")
        self.stdout.write("  GET  http://127.0.0.1:8000/api/society-admin/staff-guards/kpi/?society=1")
        self.stdout.write("  GET  http://127.0.0.1:8000/api/society-admin/vendors/kpi/?society=1")
        self.stdout.write("  GET  http://127.0.0.1:8000/api/society-admin/security/dashboard/?society=1")
        self.stdout.write("  GET  http://127.0.0.1:8000/api/society-admin/payments/overview/?society=1")
        self.stdout.write("  GET  http://127.0.0.1:8000/api/platform-admin/dashboard/stats/")
        self.stdout.write("  GET  http://127.0.0.1:8000/api/platform-admin/dashboard/societies/")
        self.stdout.write(self.style.SUCCESS("-" * 55))
